import type { GuildBasedChannel, PermissionResolvable } from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { Buildable } from "../../core/Command";
import Command from "../../core/Command";
import CommandContextType from "../../core/CommandContextType";
import type InteractionContext from "../../core/InteractionContext";
import { fetchMember } from "../../utils/api";

class StarboardCommand extends Command {
    public override readonly name = "starboard";
    public override readonly description: string = "Manage starboard settings";
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
                        .setDescription("Enable starboard"),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("disable")
                        .setDescription("Disable starboard"),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("channel")
                        .setDescription("Set a starboard channel")
                        .addChannelOption((option) =>
                            option
                                .setName("channel")
                                .setDescription("The channel for starboard")
                                .setRequired(true)
                                .addChannelTypes(ChannelType.GuildText),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("emoji")
                        .setDescription("Set starboard trigger emojis")
                        .addStringOption((option) =>
                            option
                                .setName("emoji")
                                .setDescription(
                                    "The trigger emojis, separated by spaces. Use 'ALL' to for all reactions.",
                                )
                                .setRequired(true),
                        ),
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("count")
                        .setDescription(
                            "Set a starboard reaction count requirement",
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("min_count")
                                .setDescription(
                                    "The minimum reaction count required for starboard",
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
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.enabled = true;
            });

        await context.reply("Starboard enabled.").success();
    }

    private async disable(context: InteractionContext) {
        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.enabled = false;
            });

        await context.reply("Starboard disabled.").success();
    }

    private async setChannel(context: InteractionContext) {
        const channel = context.options.getChannel(
            "channel",
            true,
        ) as GuildBasedChannel;

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
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.channel = channel.id;
            });

        await context
            .reply(`Starboard channel is now set to ${channel.toString()}.`)
            .success();
    }

    private async setEmoji(context: InteractionContext) {
        const emojis = context.options.getString("emoji", true).split(/\s+/);

        console.log(emojis);

        for (const emoji of emojis) {
            if (
                emoji.toLowerCase() !== "all" &&
                !/<a?:.+:\d+>/.test(emoji) &&
                !/^\p{Extended_Pictographic}$/gu.test(emoji)
            ) {
                return await context
                    .reply("Invalid emoji specified: " + emoji)
                    .error();
            }
        }

        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.reaction_emojis =
                    emojis[0].toLowerCase() === "all" ? true : emojis;
            });

        await context
            .reply(`Starboard emoji(s) are now set to ${emojis.join(", ")}.`)
            .success();
    }

    private async setCount(context: InteractionContext) {
        const count = context.options.getInteger("min_count", true);

        await this.application
            .service("configurationService")
            .transaction(context.guildId, (config) => {
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.min_reactions = count;
            });

        await context
            .reply(`Starboard reaction count is now set to ${count}.`)
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
                config.starboard ??= {} as unknown as typeof config.starboard;
                config.starboard!.excluded_channels ??= [];

                const index = config.starboard!.excluded_channels.indexOf(
                    channel.id,
                );

                if (index === -1) {
                    config.starboard!.excluded_channels.push(channel.id);
                } else {
                    config.starboard!.excluded_channels.splice(index, 1);
                }

                return config;
            });

        await context
            .reply(
                `Channel ${channel.toString()} is now ${
                    config.starboard!.excluded_channels.includes(channel.id)
                        ? "excluded"
                        : "included"
                } from starboard.`,
            )
            .success();
    }
}

export default StarboardCommand;
