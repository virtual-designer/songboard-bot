import { version } from "../../../package.json";
import type { Buildable } from "../../core/Command";
import Command from "../../core/Command";
import type InteractionContext from "../../core/InteractionContext";
import type LegacyContext from "../../core/LegacyContext";
import { f } from "../../utils/utils";

class AboutCommand extends Command {
    public override readonly name = "about";
    public override readonly description = "Get information about the bot.";
    public override readonly usage = [""];

    public override build(): Buildable[] {
        return [this.buildChatInput()];
    }

    public override async execute(context: LegacyContext | InteractionContext) {
        await context.reply({
            embeds: [
                {
                    description:
                        f`## Songboard Bot
                        :musical_note: **__A free and open source bot that puts your favorite songs on the board!__**` +
                        "\n\n" +
                        f`This bot was made specially for [The Spotify Hangout](https://discord.gg/spotify) Discord Server.` +
                        "\n\n" +
                        f`
                    This bot is free software, and you are welcome to redistribute it under certain conditions. See the [GNU Affero General Public License v3.0](https://gnu.org/licenses/agpl-3.0.html) for more detailed information.
                `,
                    color: 0x7209e3,
                    thumbnail: {
                        url: this.application.client.user.displayAvatarURL(),
                    },
                    footer: {
                        text: `Copyright © Songboard Bot Developers ${new Date().getFullYear()}`,
                    },
                    fields: [
                        {
                            name: "Version",
                            value: `${version}`,
                            inline: true,
                        },
                        {
                            name: "Source Code",
                            value: "[GitHub](https://github.com/virtual-designer/songboard-bot)",
                            inline: true,
                        },
                        {
                            name: "Licensed Under",
                            value: "[GNU Affero General Public License v3.0](https://gnu.org/licenses/agpl-3.0.html)",
                            inline: true,
                        },
                        {
                            name: "Developers",
                            value: "Ar Rakin (<@774553653394538506>)",
                        },
                    ],
                },
            ],
        });
    }
}

export default AboutCommand;
