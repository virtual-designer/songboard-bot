import type { Client } from "discord.js";
import { Events } from "discord.js";
import EventListener from "../core/EventListener";

class ReadyEventListener extends EventListener<Events.ClientReady> {
    public readonly name = Events.ClientReady;

    public async execute(client: Client<true>) {
        this.application.logger.info(`Logged in as @${client.user.username}`);
        await this.application
            .service("commandManager")
            .registerApplicationCommands();
    }
}

export default ReadyEventListener;
