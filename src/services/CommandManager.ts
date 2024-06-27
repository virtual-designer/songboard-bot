import { Collection, Interaction, Message } from "discord.js";
import type Command from "../core/Command";
import CommandContextType from "../core/CommandContextType";
import InteractionContext from "../core/InteractionContext";
import LegacyContext from "../core/LegacyContext";
import Service from "../core/Service";
import { Name } from "../core/ServiceManager";
import { env } from "../env/env";

declare global {
    interface ApplicationServices {
        commandManager: CommandManager;
    }
}

@Name("commandManager")
class CommandManager extends Service {
    public readonly commands = new Collection<string, Command>();

    public addCommand(command: Command) {
        this.commands.set(command.name, command);

        command.aliases.forEach((alias) => {
            this.commands.set(alias, command);
        });
    }

    public getCommand(name: string) {
        return this.commands.get(name);
    }

    public async registerApplicationCommands() {
        if (env.SONGBOARD_BOT_REGISTER_COMMANDS === "false") {
            return;
        }

        const data = this.commands.map((command) => command.build()).flat(1);

        if (!env.SONGBOARD_BOT_TEST_GUILD_ID) {
            if (!this.application.client.application) {
                throw new Error("Application not available");
            }

            const { size } =
                await this.application.client.application.commands.set(data);

            this.logger.info(`Registered ${size} application commands`);
        } else {
            const guild = this.application.client.guilds.cache.get(
                env.SONGBOARD_BOT_TEST_GUILD_ID,
            );

            if (!guild) {
                throw new Error("Test guild not found");
            }

            const { size } = await guild.commands.set(data);

            this.logger.info(
                `Registered ${size} application commands in test guild`,
            );
        }
    }

    public async runFromMessage(message: Message<true>) {
        let { prefix } = this.application
            .service("configurationService")
            .forGuild(message.guildId);

        if (!message.content.startsWith(prefix)) {
            if (
                message.content.startsWith(
                    `<@${this.application.client.user.id}>`,
                )
            ) {
                prefix = `<@${this.application.client.user.id}>`;
            } else if (
                message.content.startsWith(
                    `<@!${this.application.client.user.id}>`,
                )
            ) {
                prefix = `<@!${this.application.client.user.id}>`;
            } else {
                this.logger.debug("Missing prefix in message");
                return;
            }
        }

        const argv = message.content.slice(prefix.length).split(" ");
        const [commandName] = argv;
        const command = this.getCommand(commandName);

        if (
            !command ||
            !command.supportedContexts.includes(CommandContextType.Message)
        ) {
            this.logger.debug("No such command found");
            return;
        }

        const context = new LegacyContext(message, argv);

        try {
            await command.run(context);
        } catch (error) {
            this.logger.error(`${error}`);
        }
    }

    public async runFromInteraction(interaction: Interaction) {
        if (!interaction.isChatInputCommand() || !interaction.inGuild()) {
            return;
        }

        const { commandName } = interaction;
        const command = this.getCommand(commandName);

        if (
            !command ||
            !command.supportedContexts.includes(
                CommandContextType.CommandInteraction,
            )
        ) {
            this.logger.debug("No such command found");
            return;
        }

        const context = new InteractionContext(interaction);

        try {
            await command.run(context);
        } catch (error) {
            this.logger.error(`${(error as Error)?.stack}`);
        }
    }
}

export default CommandManager;
