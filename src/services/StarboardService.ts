import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonInteraction,
    ButtonStyle,
    ContainerBuilder,
    escapeInlineCode,
    escapeMarkdown,
    Guild,
    Interaction,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    Message,
    MessageFlags,
    MessageReaction,
    PartialMessage,
    PartialMessageReaction,
    SectionBuilder,
    SeparatorSpacingSize,
    TextDisplayBuilder,
    ThumbnailBuilder,
    User,
} from "discord.js";
import { and, eq } from "drizzle-orm";
import Semaphore from "../concurrent/Semaphore";
import Service from "../core/Service";
import { Name } from "../core/ServiceManager";
import { starboardMessages } from "../models/StarboardMessage";
import { fetchChannel } from "../utils/api";

declare global {
    interface ApplicationServices {
        starboardService: StarboardService;
    }
}

@Name("starboardService")
class StarboardService extends Service {
    private readonly semaphores = new Map<string, Semaphore>();

    public async onMessageReactionAdd(
        reaction: MessageReaction | PartialMessageReaction,
        user: User,
    ) {
        if (!reaction.message.guild || user.bot) {
            return;
        }

        this.application.logger.debug(JSON.stringify(reaction, null, 2));
        this.application.logger.debug(`Reaction added: ${reaction.emoji.name}`);

        const { starboard } = this.application
            .service("configurationService")
            .forGuild(reaction.message.guild.id);

        if (starboard?.channel === "0" || !starboard?.reaction_emoji) {
            this.application.logger.debug(
                "Starboard is not configured or disabled",
            );

            return;
        }

        if (
            !starboard?.enabled ||
            (reaction.emoji.id !== starboard?.reaction_emoji &&
                reaction.emoji.name !== starboard?.reaction_emoji &&
                starboard.reaction_emoji !== true) ||
            starboard.excluded_channels.includes(reaction.message.channelId) ||
            !reaction.message.inGuild() ||
            (reaction.message.channel.parentId &&
                starboard.excluded_channels.includes(
                    reaction.message.channel.parentId,
                ))
        ) {
            this.application.logger.debug(
                "Returning as conditions don't match",
            );
            return;
        }

        if (starboard.channel === reaction.message.channelId) {
            this.application.logger.debug(
                "Cannot operate inside starboard channel",
            );

            return;
        }

        const { message } = reaction;
        const { guild } = message as (Message<true> | PartialMessage) & {
            guild: Guild;
        };

        let semaphore = this.semaphores.get(guild.id);

        if (!semaphore) {
            semaphore = new Semaphore(1);
            this.semaphores.set(guild.id, semaphore);
        }

        await semaphore.acquire();

        if (message.partial) {
            try {
                await message.fetch();
            } catch (error) {
                this.application.logger.error("Failed to fetch message");
                this.application.logger.error(`${error}`);
                return;
            }
        }

        const existing =
            await this.application.drizzle.query.starboardMessages.findFirst({
                where: and(
                    eq(starboardMessages.messageId, message.id),
                    eq(starboardMessages.channelId, message.channelId),
                    eq(starboardMessages.guildId, guild.id),
                ),
            });

        if (existing) {
            semaphore.release();
            this.application.logger.debug("Starboard message already exists");
            return;
        }

        const id = reaction.emoji.id ?? reaction.emoji.name;

        if (!id) {
            semaphore.release();
            this.application.logger.debug("Invalid emote");
            return;
        }

        if (reaction.partial) {
            try {
                await reaction.fetch();

                if (reaction.count === null) {
                    throw new Error("Reaction count is null");
                }
            } catch (error) {
                this.application.logger.error("Failed to fetch reaction count");
                this.application.logger.error(`${error}`);
                semaphore.release();
                return;
            }
        }

        const count = reaction.count;

        this.application.logger.debug(
            reaction.count.toString(),
            starboard.min_reactions.toString(),
        );

        if (count < starboard.min_reactions) {
            semaphore.release();
            this.application.logger.debug("Less reactions");
            return;
        }

        const starboardChannel = await fetchChannel(guild, starboard.channel);

        if (!starboardChannel?.isTextBased()) {
            semaphore.release();
            this.application.logger.debug("Not a text channel");
            return;
        }

        const author = message.member?.user ?? message.author;

        if (!author) {
            this.application.logger.debug("No message author");
            semaphore.release();
            return;
        }

        try {
            const container = new ContainerBuilder();

            const userSection = new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## Message from <@${author.id}>\n\n_** **_`,
                    ),
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder()
                        .setURL(author.displayAvatarURL({ size: 128 }))
                        .setDescription(escapeMarkdown(author.username)),
                );

            if (message.content) {
                userSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(message.content),
                );
            }

            container.addSectionComponents(userSection);

            if (message.content && message.attachments.size > 0) {
                container.addSeparatorComponents((separator) =>
                    separator
                        .setSpacing(SeparatorSpacingSize.Large)
                        .setDivider(false),
                );
            }

            if (message.attachments.size > 0) {
                const mediaAttachments: MediaGalleryItemBuilder[] = [];
                let nonMediaAttachmentList = "",
                    nonMediaAttachmentCount = 0;

                for (const attachment of message.attachments.values()) {
                    if (
                        attachment.contentType?.startsWith("image/") ||
                        attachment.contentType?.startsWith("video/")
                    ) {
                        mediaAttachments.push(
                            new MediaGalleryItemBuilder()
                                .setURL(attachment.url)
                                .setDescription(
                                    !attachment.description
                                        ? attachment.name
                                        : `${attachment.name} - ${attachment.description}`,
                                )
                                .setSpoiler(attachment.spoiler),
                        );
                    } else {
                        const sanitizedName = attachment.name
                            .replace(/[^a-zA-Z0-9_.-]/g, "_")
                            .substring(0, 100);

                        nonMediaAttachmentList += `- [${escapeInlineCode(
                            sanitizedName,
                        )}](${attachment.url})${
                            attachment.description
                                ? ` - ${escapeMarkdown(attachment.description)}`
                                : ""
                        }${attachment.spoiler ? " [SPOILER]" : ""}\n`;

                        nonMediaAttachmentCount++;
                    }
                }

                if (mediaAttachments.length > 0) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(mediaAttachments),
                    );
                }

                if (nonMediaAttachmentList) {
                    container.addSeparatorComponents((separator) =>
                        separator
                            .setSpacing(SeparatorSpacingSize.Small)
                            .setDivider(false),
                    );

                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `**${nonMediaAttachmentCount}** non-media attachments were scrubbed from the message:`,
                        ),
                    );

                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            nonMediaAttachmentList,
                        ),
                    );
                }
            }

            if (message.embeds.length > 0) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**${message.embeds.length}** embeds were scrubbed from the message.`,
                    ),
                );
            }

            container.addSeparatorComponents((separator) =>
                separator.setSpacing(SeparatorSpacingSize.Large),
            );

            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                    `-# **${count}**  ${reaction.emoji.toString()}  ${
                        count > 1 ? "reactions were" : "reaction was"
                    } used to star this message.`,
                ),
            );

            const starboardMessage = await starboardChannel.send({
                components: [container],
                flags: [MessageFlags.IsComponentsV2],
            });

            await this.application.drizzle.transaction(async (tx) => {
                const [{ rowId }] = await tx
                    .insert(starboardMessages)
                    .values({
                        messageId: message.id,
                        userId: user.id,
                        channelId: message.channelId,
                        guildId: guild.id,
                        starboardMessageId: starboardMessage.id,
                    })
                    .returning({ rowId: starboardMessages.id });

                const actionRow = this.createActionRow(rowId);

                await starboardMessage.edit({
                    components: [container, actionRow],
                    flags: [MessageFlags.IsComponentsV2],
                });
            });
        } catch (error) {
            this.application.logger.error("Failed to send starboard message");
            console.error(error);
        }

        semaphore.release();
    }

    private createActionRow(rowId: number, upvotes = 0, downvotes = 0) {
        const upvoteButton = new ButtonBuilder()
            .setCustomId(`starboard_upvote_${rowId}`)
            .setLabel(`Upvote (${upvotes})`)
            .setStyle(ButtonStyle.Secondary);

        const disabledCountButton = new ButtonBuilder()
            .setCustomId("starboard_disabled_count")
            .setLabel((upvotes - downvotes).toString())
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const downvoteButton = new ButtonBuilder()
            .setCustomId(`starboard_downvote_${rowId}`)
            .setLabel(`Downvote (${downvotes})`)
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

        const [serviceName, action, rowId] = interaction.customId.split("_");

        if (
            !rowId ||
            (serviceName !== "starboard" &&
                action !== "upvote" &&
                action !== "downvote")
        ) {
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
                await interaction
                    .editReply({
                        content: "The interaction payload is corrupted.",
                    })
                    .catch(this.application.logger.error);

                return;
            }

            const starboardMessage = await tx.query.starboardMessages.findFirst(
                {
                    where: eq(starboardMessages.id, numericRowId),
                },
            );

            if (!starboardMessage) {
                await interaction
                    .editReply({
                        content: "The interaction payload is corrupted.",
                    })
                    .catch(this.application.logger.error);

                return;
            }

            const alreadyUpvoted = starboardMessage.upvotes.includes(userId);
            const upvotes = alreadyUpvoted
                ? starboardMessage.upvotes.filter((id) => id !== userId)
                : [...starboardMessage.upvotes, userId];
            const downvotes = alreadyUpvoted
                ? starboardMessage.downvotes
                : starboardMessage.downvotes.filter(
                      (downvote) => downvote !== userId,
                  );

            await tx
                .update(starboardMessages)
                .set({
                    upvotes,
                    downvotes,
                })
                .where(eq(starboardMessages.id, numericRowId))
                .execute();

            await interaction.message
                .edit({
                    components: [
                        interaction.message.components[0],
                        this.createActionRow(
                            numericRowId,
                            upvotes.length,
                            downvotes.length,
                        ),
                    ],
                })
                .catch(this.application.logger.error);

            await interaction
                .editReply({
                    content: alreadyUpvoted
                        ? "Your vote has been removed."
                        : "You have successfully upvoted this message.",
                })
                .catch(this.application.logger.error);

            return true;
        });
    }

    private async downvote(rowId: string, interaction: ButtonInteraction) {
        const { id: userId } = interaction.user;

        await this.application.drizzle.transaction(async (tx) => {
            const numericRowId = parseInt(rowId, 10);

            if (isNaN(numericRowId)) {
                await interaction
                    .editReply({
                        content: "The interaction payload is corrupted.",
                    })
                    .catch(this.application.logger.error);

                return;
            }

            const starboardMessage = await tx.query.starboardMessages.findFirst(
                {
                    where: eq(starboardMessages.id, numericRowId),
                },
            );

            if (!starboardMessage) {
                await interaction
                    .editReply({
                        content: "The interaction payload is corrupted.",
                    })
                    .catch(this.application.logger.error);

                return;
            }

            const alreadyDownvoted =
                starboardMessage.downvotes.includes(userId);
            const downvotes = alreadyDownvoted
                ? starboardMessage.downvotes.filter((id) => id !== userId)
                : [...starboardMessage.downvotes, userId];
            const upvotes = alreadyDownvoted
                ? starboardMessage.upvotes
                : starboardMessage.upvotes.filter(
                      (upvote) => upvote !== userId,
                  );

            await tx
                .update(starboardMessages)
                .set({
                    downvotes,
                    upvotes,
                })
                .where(eq(starboardMessages.id, numericRowId))
                .execute();

            await interaction.message
                .edit({
                    components: [
                        interaction.message.components[0],
                        this.createActionRow(
                            numericRowId,
                            upvotes.length,
                            downvotes.length,
                        ),
                    ],
                })
                .catch(this.application.logger.error);

            await interaction
                .editReply({
                    content: alreadyDownvoted
                        ? "Your vote has been removed."
                        : "You have successfully downvoted this message.",
                })
                .catch(this.application.logger.error);

            return true;
        });
    }
}

export default StarboardService;
