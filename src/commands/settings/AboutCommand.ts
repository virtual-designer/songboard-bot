import Command from "../../core/Command";
import type LegacyContext from "../../core/LegacyContext";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly usage = [""];

    public override async execute(context: LegacyContext) {
        await context.reply("I made myself.").success();
    }
}

export default AboutCommand;
