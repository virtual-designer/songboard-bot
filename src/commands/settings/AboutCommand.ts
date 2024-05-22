import Command from "../../core/Command";
import type LegacyContext from "../../core/LegacyContext";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly usage = [""];

    public override async execute(context: LegacyContext) {
        context.reply("This is a bot made by me, a human.").success();
    }
}

export default AboutCommand;
