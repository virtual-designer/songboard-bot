import type { MessageReaction, User } from "discord.js";
import { Events } from "discord.js";
import EventListener from "../../core/EventListener";

class MessageReactionAddEventListener extends EventListener<Events.MessageReactionAdd> {
    public override readonly name = Events.MessageReactionAdd;

    public override async execute(reaction: MessageReaction, user: User) {
        await this.application
            .service("songboardService")
            .onMessageReactionAdd(reaction, user)
            .catch(this.application.logger.error);
    }
}

export default MessageReactionAddEventListener;
