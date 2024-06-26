import type { Interaction } from "discord.js";
import { Events } from "discord.js";
import EventListener from "../../core/EventListener";

class InteractionCreateEventListener extends EventListener<Events.InteractionCreate> {
    public override readonly name = Events.InteractionCreate;

    public override async execute(interaction: Interaction) {
        await this.application
            .service("songboardService")
            .onInteractionCreate(interaction)
            .catch(this.application.logger.error);
    }
}

export default InteractionCreateEventListener;
