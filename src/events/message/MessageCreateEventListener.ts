import type { Message } from "discord.js";
import { Events } from "discord.js";
import EventListener from "../../core/EventListener";

class MessageCreateEventListener extends EventListener<Events.MessageCreate> {
    public override readonly name = Events.MessageCreate;

    public override async execute(message: Message) {
        if (message.author.bot || !message.inGuild()) {
            return;
        }

        this.application.service("commandManager").runFromMessage(message);
    }
}

export default MessageCreateEventListener;