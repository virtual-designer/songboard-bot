import { Collection, Message } from "discord.js";
import type Command from "../core/Command";
import LegacyContext from "../core/LegacyContext";
import Service from "../core/Service";
import { Name } from "../core/ServiceManager";

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

    public async runFromMessage(message: Message<true>) {
        let {prefix} = this.application.service("configurationService").forGuild(message.guildId);
    
        if (!message.content.startsWith(prefix)) {
            if (message.content.startsWith(`<@${this.application.client.user.id}>`)) {
                prefix = `<@${this.application.client.user.id}>`;
            }
            else if (message.content.startsWith(`<@!${this.application.client.user.id}>`)) {
                prefix = `<@!${this.application.client.user.id}>`;
            }
            else {
                this.logger.debug("Missing prefix in message");
                return;
            }
        }

        const argv = message.content.slice(prefix.length).split(" ");
        const [commandName] = argv;
        const command = this.getCommand(commandName);

        if (!command) {
            this.logger.debug("No such command found");
            return;
        }

        const context = new LegacyContext(message, argv);
        await command.execute(context);
    }
}

export default CommandManager;