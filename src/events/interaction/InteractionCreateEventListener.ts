import type { Interaction } from "discord.js";
import { Events } from "discord.js";
import EventListener from "../../core/EventListener";

class InteractionCreateEventListener extends EventListener<Events.InteractionCreate> {
    public override readonly name = Events.InteractionCreate;

    public override async execute(interaction: Interaction) {
        if (interaction.isChatInputCommand()) {
            await this.application
                .service("commandManager")
                .runFromInteraction(interaction)
                .catch(this.application.logger.error);
        }

        if (interaction.isButton()) {
            await this.application
                .service("songboardService")
                .onInteractionCreate(interaction)
                .catch(this.application.logger.error);
        }
    }
}

export default InteractionCreateEventListener;
