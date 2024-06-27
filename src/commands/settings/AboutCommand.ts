import type { Buildable } from "../../core/Command";
import Command from "../../core/Command";
import type InteractionContext from "../../core/InteractionContext";
import type LegacyContext from "../../core/LegacyContext";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly usage = [""];

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: LegacyContext | InteractionContext) {
        await context.reply("I made myself.");
    }
}

export default AboutCommand;
