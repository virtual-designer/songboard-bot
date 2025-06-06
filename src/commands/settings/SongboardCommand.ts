import type { GuildBasedChannel, PermissionResolvable } from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { Buildable } from "../../core/Command";
import Command from "../../core/Command";
import CommandContextType from "../../core/CommandContextType";
import type InteractionContext from "../../core/InteractionContext";
import { fetchMember } from "../../utils/api";

class SongboardCommand extends Command {
    public override readonly name = "songboard";
    public override readonly description: string = "Manage songboard settings";
    public override readonly usage = ["<subcommand> [...args]"];
    public override readonly supportedContexts = [
        CommandContextType.CommandInteraction,
    ];
    public override readonly permissions: PermissionResolvable[] = [
        PermissionFlagsBits.ManageGuild,
    ];

    public override build(): Buildable[] {
        return [
            this.buildChatInput()
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("enable")
                        .setDescription("Enable songboard"),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("disable")
                        .setDescription("Disable songboard"),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("channel")
                        .setDescription("Set a songboard channel")
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("The channel for songboard")
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("emoji")
                        .setDescription("Set a songboard trigger emoji")
                        .addStringOption((option) =>
                            option
                                .setName("emoji")
                                .setDescription(
                                    "The trigger emoji for songboard",
                                )
                                .setRequired(true),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("count")
                        .setDescription(
                            "Set a songboard reaction count requirement",
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("min_count")
                                .setDescription(
                                    "The minimum reaction count required for songboard",
                                )
                                .setRequired(true)
                                .setMinValue(0)
                                .setMaxValue(50),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("exclusion")
                        .setDescription("Toggle exclusion for a channel.")
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("The target channel")
                                .setRequired(true)
                                .addChannelTypes(
                                    ChannelType.GuildText,
                                    ChannelType.GuildAnnouncement,
                                    ChannelType.GuildVoice,
                                    ChannelType.GuildCategory,
                                ),
                        ),
                ),
        ];
    }

    public override async execute(context: InteractionContext) {
        const interaction = context.value;
        const subcommand = interaction.options.getSubcommand(true);

        switch (subcommand) {
            case "enable":
                return void (await this.enable(context));
            case "disable":
                return void (await this.disable(context));
            case "channel":
                return void (await this.setChannel(context));
            case "emoji":
                return void (await this.setEmoji(context));
            case "count":
                return void (await this.setCount(context));
            case "exclusion":
                return void (await this.toggleExclusion(context));
        }
    }

    private async enable(context: InteractionContext) {
        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.enabled = true;
            });

        await context.reply("Songboard enabled.").success();
    }

    private async disable(context: InteractionContext) {
        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.enabled = false;
            });

        await context.reply("Songboard disabled.").success();
    }

    private async setChannel(context: InteractionContext) {
        const channel = context.options.getChannel(
            "channel",
            true,
        ) as GuildBasedChannel;

        // check if the bot can send messages to the channel

        if (!channel.isTextBased()) {
            return await context
                .reply("The channel must be a text channel.")
                .error();
        }

        const me =
            context.guild.members.me ??
            (await fetchMember(context.guild, this.application.client.user.id));

        if (!me) {
            return await context
                .reply("An internal error has occurred.")
                .error();
        }

        if (
            !channel
                .permissionsFor(me, true)
                ?.has(
                    [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                        PermissionFlagsBits.EmbedLinks,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ViewChannel,
                    ],
                    true,
                )
        ) {
            return await context
                .reply(
                    "I don't have the required permissions to send messages in that channel.",
                )
                .error();
        }

        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.channel = channel.id;
            });

        await context
            .reply(`Songboard channel is now set to ${channel.toString()}.`)
            .success();
    }

    private async setEmoji(context: InteractionContext) {
        const emoji = context.options.getString("emoji", true);

        if (
            !/<a?:.+:\d+>/.test(emoji) ||
            !/(\u00a9|\u00ae|[\u25a0-\u27bf]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff])/g.test(
                emoji,
            )
        ) {
            return await context.reply("Invalid emoji specified.").error();
        }

        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.reaction_emoji = emoji;
            });

        await context
            .reply(`Songboard emoji is now set to ${emoji}.`)
            .success();
    }

    private async setCount(context: InteractionContext) {
        const count = context.options.getInteger("min_count", true);

        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.min_reactions = count;
            });

        await context
            .reply(`Songboard reaction count is now set to ${count}.`)
            .success();
    }

    private async toggleExclusion(context: InteractionContext) {
        const channel = context.options.getChannel(
            "channel",
            true,
        ) as GuildBasedChannel;

        const config = await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.songboard ??= {} as unknown as typeof config.songboard;
                config.songboard!.excluded_channels ??= [];

                const index = config.songboard!.excluded_channels.indexOf(
                    channel.id,
                );

                if (index === -1) {
                    config.songboard!.excluded_channels.push(channel.id);
                } else {
                    config.songboard!.excluded_channels.splice(index, 1);
                }

                return config;
            });

        await context
            .reply(
                `Channel ${channel.toString()} is now ${
                    config.songboard!.excluded_channels.includes(channel.id)
                        ? "excluded"
                        : "included"
                } from songboard.`,
            )
            .success();
    }
}

export default SongboardCommand;
