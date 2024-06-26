import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    Interaction,
    Message,
    MessageReaction,
    User,
    bold,
} from "discord.js";
import { eq } from "drizzle-orm";
import Semaphore from "../concurrent/Semaphore";
import Service from "../core/Service";
import { Name } from "../core/ServiceManager";
import { songMessages } from "../models/SongMessage";
import { fetchChannel } from "../utils/api";

declare global {
    interface ApplicationServices {
        songboardService: SongboardService;
    }
}

@Name("songboardService")
class SongboardService extends Service {
    private readonly allowedLinks = [
        "https://open.spotify.com/track/",
        "https://spotify.link/",
    ];
    private readonly semaphores = new Map<string, Semaphore>();

    public async handleReactionAdd(reaction: MessageReaction, user: User) {
        if (!reaction.message.guild || user.bot) {
            return;
        }

        const { songboard } = this.application
            .service("configurationService")
            .forGuild(reaction.message.guild.id);

        if (
            !songboard?.enabled ||
            (reaction.emoji.id !== songboard?.reaction_emoji &&
                reaction.emoji.name !== songboard?.reaction_emoji) ||
            songboard.excluded_channels.includes(reaction.message.channelId) ||
            !reaction.message.inGuild() ||
            (reaction.message.channel.parentId &&
                songboard.excluded_channels.includes(
                    reaction.message.channel.parentId,
                ))
        ) {
            return;
        }

        if (songboard.channel === reaction.message.channelId) {
            return;
        }

        const { message } = reaction as MessageReaction;
        const { guild } = message as Message<true>;

        let semaphore = this.semaphores.get(guild.id);

        if (!semaphore) {
            semaphore = new Semaphore(1);
            this.semaphores.set(guild.id, semaphore);
        }

        await semaphore.acquire();

        if (
            !this.allowedLinks.some((link) => message.content?.includes(link))
        ) {
            return;
        }

        const id = reaction.emoji.id ?? reaction.emoji.name;

        if (!id) {
            return;
        }

        if (reaction.count < songboard.min_reactions) {
            return;
        }

        const songboardChannel = await fetchChannel(guild, songboard.channel);

        if (!songboardChannel?.isTextBased()) {
            return;
        }

        const songLinks = message.content?.match(
            /https:\/\/open\.spotify\.com\/(track)\/[a-zA-Z0-9]+/g,
        );
        const shortLinks = message.content?.match(
            /https:\/\/spotify\.link\/[a-zA-Z0-9_-]+/g,
        );

        if (!songLinks && !shortLinks) {
            return;
        }

        const allLinks = [
            ...new Set([...(songLinks ?? []), ...(shortLinks ?? [])]),
        ];
        const strippedContent = message.content?.replace(
            /((https:\/\/open\.spotify\.com\/(track)\/[a-zA-Z0-9]+)|(https:\/\/spotify\.link\/[a-zA-Z0-9_-]+))(\?([^\s]*))?/g,
            "",
        );

        const { id: songboardMessageId } = await songboardChannel.send({
            embeds: [
                {
                    author: {
                        name: user.username,
                        icon_url: user.displayAvatarURL(),
                        url: message.url,
                    },
                    url: message.url,
                    color: Math.floor(Math.random() * 0xffffff),
                    description:
                        strippedContent ||
                        (message.attachments.size > 1
                            ? bold(`+ ${message.attachments.size - 1}`) +
                              " attachments"
                            : undefined),
                    image:
                        message.attachments.size > 0
                            ? {
                                  url: message.attachments.first()!.url,
                              }
                            : undefined,
                    fields: [
                        {
                            name: "Songs",
                            value: "Linked below. :arrow_down:",
                            inline: true,
                        },
                        {
                            name: "Message",
                            value: message.url,
                            inline: true,
                        },
                    ],
                    footer: {
                        text: `${reaction.count} reaction${reaction.count > 1 ? "s" : ""} | ${message.id}`,
                    },
                },
            ],
        });

        await this.application.drizzle.transaction(async (tx) => {
            const [{ rowId }] = await tx
                .insert(songMessages)
                .values({
                    messageId: message.id,
                    userId: user.id,
                    channelId: message.channelId,
                    guildId: guild.id,
                    songs: allLinks,
                    songboardMessageId,
                })
                .returning({ rowId: songMessages.id });

            const { id: songboardSongMessageId } = await songboardChannel.send({
                content: allLinks.join("\n"),
                components: [this.createActionRow(rowId)],
            });

            await tx
                .update(songMessages)
                .set({
                    songboardSongMessageId,
                })
                .where(eq(songMessages.id, rowId))
                .execute();
        });

        semaphore.release();
    }

    private createActionRow(rowId: number, votes = 0) {
        const upvoteButton = new ButtonBuilder()
            .setCustomId(`upvote_${rowId}`)
            .setLabel("Upvote")
            .setStyle(ButtonStyle.Secondary);

        const disabledCountButton = new ButtonBuilder()
            .setCustomId("disabled_count")
            .setLabel(votes.toString())
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const downvoteButton = new ButtonBuilder()
            .setCustomId(`downvote_${rowId}`)
            .setLabel("Downvote")
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            upvoteButton,
            disabledCountButton,
            downvoteButton,
        );

        return row;
    }

    public async onInteractionCreate(interaction: Interaction) {
        if (!interaction.isButton()) {
            return;
        }

        const [action, rowId] = interaction.customId.split("_");

        if (!rowId || !action) {
            return;
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            switch (action) {
                case "upvote":
                    await this.upvote(rowId, interaction);
                    break;
                case "downvote":
                    await this.downvote(rowId, interaction);
                    break;

                default:
                    return;
            }
        } catch (error) {
            this.application.logger.error(`${error}`);
        }
    }

    private async upvote(rowId: string, interaction: ButtonInteraction) {
        const { id: userId } = interaction.user;

        await this.application.drizzle.transaction(async (tx) => {
            const numericRowId = parseInt(rowId, 10);

            if (isNaN(numericRowId)) {
                await interaction.editReply({
                    content: "The interaction payload is corrupted.",
                });

                return;
            }

            const songMessage = await tx.query.songMessages.findFirst({
                where: eq(songMessages.id, numericRowId),
            });

            if (!songMessage) {
                await interaction.editReply({
                    content: "The interaction payload is corrupted.",
                });

                return;
            }

            const alreadyUpvoted = songMessage.upvotes.includes(userId);
            const upvotes = alreadyUpvoted
                ? songMessage.upvotes.filter((id) => id !== userId)
                : [...songMessage.upvotes, userId];
            const downvotes = alreadyUpvoted
                ? songMessage.downvotes
                : songMessage.downvotes.filter(
                      (downvote) => downvote !== userId,
                  );

            await tx
                .update(songMessages)
                .set({
                    upvotes,
                    downvotes,
                })
                .where(eq(songMessages.id, numericRowId))
                .execute();

            await interaction.message.edit({
                components: [
                    this.createActionRow(
                        numericRowId,
                        upvotes.length - downvotes.length,
                    ),
                ],
            });

            await interaction.editReply({
                content: alreadyUpvoted
                    ? "Your vote has been removed."
                    : "You have successfully upvoted this message.",
            });

            return true;
        });
    }

    private async downvote(rowId: string, interaction: ButtonInteraction) {
        const { id: userId } = interaction.user;

        await this.application.drizzle.transaction(async (tx) => {
            const numericRowId = parseInt(rowId, 10);

            if (isNaN(numericRowId)) {
                await interaction.editReply({
                    content: "The interaction payload is corrupted.",
                });

                return;
            }

            const songMessage = await tx.query.songMessages.findFirst({
                where: eq(songMessages.id, numericRowId),
            });

            if (!songMessage) {
                await interaction.editReply({
                    content: "The interaction payload is corrupted.",
                });

                return;
            }

            const alreadyDownvoted = songMessage.downvotes.includes(userId);
            const downvotes = alreadyDownvoted
                ? songMessage.downvotes.filter((id) => id !== userId)
                : [...songMessage.downvotes, userId];
            const upvotes = alreadyDownvoted
                ? songMessage.upvotes
                : songMessage.upvotes.filter((upvote) => upvote !== userId);

            await tx
                .update(songMessages)
                .set({
                    downvotes,
                    upvotes,
                })
                .where(eq(songMessages.id, numericRowId))
                .execute();

            await interaction.message.edit({
                components: [
                    this.createActionRow(
                        numericRowId,
                        upvotes.length - downvotes.length,
                    ),
                ],
            });

            await interaction.editReply({
                content: alreadyDownvoted
                    ? "Your vote has been removed."
                    : "You have successfully downvoted this message.",
            });

            return true;
        });
    }
}

export default SongboardService;