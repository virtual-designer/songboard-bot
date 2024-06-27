import type { GuildTextBasedChannel } from "discord.js";
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    Colors,
    ComponentType,
    InteractionCollector,
    InteractionType,
    escapeCodeBlock,
    escapeMarkdown,
} from "discord.js";
import * as uuid from "uuid";
import type { Buildable } from "../../core/Command";
import Command from "../../core/Command";
import InteractionContext from "../../core/InteractionContext";
import type LegacyContext from "../../core/LegacyContext";
import { isSystemAdmin } from "../../utils/permission";

class EvalCommand extends Command {
    public override readonly name = "eval";
    public override readonly description: string =
        "Evaluates raw JavaScript code.";
    public override readonly usage = ["<...code: RestString>"];
    public override readonly systemAdminOnly = true;
    private _errorOccurred = false;
    private _prettier: unknown;
    private _prettierEstree: unknown;

    public override build(): Buildable[] {
        return [
            this.buildChatInput().addStringOption((option) =>
                option
                    .setName("code")
                    .setDescription("The code to evaluate.")
                    .setRequired(true),
            ),
        ];
    }

    private async getPrettier() {
        if (this._prettier === undefined) {
            try {
                this._prettier = await import("prettier".toString());
                this._prettierEstree = await import(
                    "prettier/plugins/estree".toString()
                );
            } catch (error) {
                this._prettier = false;
                this._prettierEstree = undefined;
            }
        }

        if (this._prettier === false) {
            return null;
        }

        return this._prettier as {
            format: (
                code: string,
                options: Record<string, unknown>,
            ) => Promise<string>;
        };
    }

    private async formatCode(code: string) {
        const prettier = await this.getPrettier();

        if (!prettier) {
            return code;
        }

        return prettier.format(code, {
            parser: "espree",
            plugins: [this._prettierEstree],
        });
    }

    private async sendErrorMessage(
        context: LegacyContext | InteractionContext,
        code: string,
        errorMessage?: string,
        description?: string,
    ) {
        const evalId = uuid.v4();
        const message = await context.reply({
            embeds: [
                {
                    description: `### ${this.emoji("error")} ${errorMessage}\n\nThe system tried to execute the following code:\n\`\`\`js\n${escapeCodeBlock(await this.formatCode(code))}\n\`\`\`\n\n`,
                    color: Colors.Red,
                    footer: {
                        text: "Execution Failed",
                    },
                    timestamp: new Date().toISOString(),
                },
            ],
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`eval_error_${evalId}`)
                        .setLabel("Error Details")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("📤"),
                ),
            ],
        });

        const collector = new InteractionCollector(context.guild.client, {
            filter: async (interaction) => {
                if (interaction.customId !== `eval_error_${evalId}`) {
                    return false;
                }

                if (!isSystemAdmin(interaction.user.id)) {
                    interaction
                        .reply({
                            ephemeral: true,
                            content:
                                "You are not allowed to interact with this button.",
                        })
                        .catch(this.application.logger.debug);

                    return false;
                }

                return true;
            },
            time: 120_000,
            componentType: ComponentType.Button,
            interactionType: InteractionType.MessageComponent,
            channel: context.channel as GuildTextBasedChannel,
            guild: context.guild,
            message,
        });

        collector.on("collect", (interaction) => {
            interaction
                .reply({
                    embeds: [
                        {
                            description: `### Error Details\n\n${
                                !description || description.trim() === ""
                                    ? "*No output*"
                                    : `\`\`\`${description}\`\`\``
                            }`,
                            color: 0x007bff,
                            footer: {
                                text: "The error details are only visible to you for privacy reasons.",
                            },
                        },
                    ],
                    ephemeral: true,
                })
                .catch(this.application.logger.debug);
        });

        collector.on("end", () => {
            message
                .edit({
                    embeds: [message.embeds[0]],
                    components: [],
                })
                .catch(this.application.logger.debug);
        });
    }

    private createUncaughtErrorHandler(
        code: string,
        context: InteractionContext | LegacyContext,
    ) {
        return async (error: Error) => {
            this._errorOccurred = true;

            try {
                return await this.sendErrorMessage(
                    context,
                    code,
                    "An error occurred while evaluating the code",
                    escapeMarkdown(
                        error.stack ?? error.message ?? "[undefined]",
                    ),
                );
            } catch (error) {
                return this.application.logger.error(`${error}`);
            }
        };
    }

    private createUnhandledPromiseRejectionHandler(
        code: string,
        context: InteractionContext | LegacyContext,
    ) {
        return async (error: unknown) => {
            this._errorOccurred = true;

            try {
                return await this.sendErrorMessage(
                    context,
                    code,
                    "Caught an unhandled promise rejection while evaluating the code",
                    typeof error === "string" ||
                        typeof (error as string)?.toString === "function"
                        ? escapeCodeBlock(
                              (error as string)?.toString
                                  ? (error as string).toString()
                                  : (error as string),
                          )
                        : `${error}`,
                );
            } catch (error) {
                return this.application.logger.error(`${error}`);
            }
        };
    }

    public override async execute(
        context: InteractionContext | LegacyContext,
    ): Promise<void> {
        this._errorOccurred = false;

        const code =
            context instanceof InteractionContext
                ? context.options.getString("code", true)
                : context.value.content
                      .slice(
                          this.application
                              .service("configurationService")
                              .forGuild(context.guildId).prefix.length,
                      )
                      .trim()
                      .slice(context.commandName.length)
                      .trim();

        const uncaughtErrorHandler = this.createUncaughtErrorHandler(
            code,
            context,
        );
        const rejectionHandler = this.createUnhandledPromiseRejectionHandler(
            code,
            context,
        );

        process.on("uncaughtException", uncaughtErrorHandler);
        process.on("unhandledRejection", rejectionHandler);

        try {
            const { application } = this;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { client } = application;

            const result = eval(code);
            const string = `${
                typeof result === "string" ||
                typeof result?.toString === "function"
                    ? escapeCodeBlock(
                          (result as string)?.toString
                              ? (result as string).toString()
                              : (result as string),
                      )
                    : result
            }`;

            if (!this._errorOccurred) {
                const evalId = uuid.v4();
                const message = await context.reply({
                    embeds: [
                        {
                            description: `### ${this.emoji("check")} Execution succeeded\n\nThe following code was executed:\n\`\`\`js\n${escapeCodeBlock(await this.formatCode(code))}\n\`\`\`\n\n`,
                            color: Colors.Green,
                            footer: {
                                text: "Executed",
                            },
                            timestamp: new Date().toISOString(),
                        },
                    ],
                    components: [
                        new ActionRowBuilder<ButtonBuilder>().addComponents(
                            new ButtonBuilder()
                                .setCustomId(`eval_output_${evalId}`)
                                .setLabel("Output")
                                .setStyle(ButtonStyle.Secondary)
                                .setEmoji("📤"),
                        ),
                    ],
                });

                const collector = new InteractionCollector(
                    context.guild.client,
                    {
                        filter: async (interaction) => {
                            if (
                                interaction.customId !== `eval_output_${evalId}`
                            ) {
                                return false;
                            }

                            if (!isSystemAdmin(interaction.user.id)) {
                                interaction
                                    .reply({
                                        ephemeral: true,
                                        content:
                                            "You are not allowed to interact with this button.",
                                    })
                                    .catch(this.application.logger.debug);

                                return false;
                            }

                            return true;
                        },
                        time: 120_000,
                        componentType: ComponentType.Button,
                        interactionType: InteractionType.MessageComponent,
                        channel: context.channel as GuildTextBasedChannel,
                        guild: context.guild,
                        message,
                    },
                );

                collector.on("collect", (interaction) => {
                    interaction
                        .reply({
                            embeds: [
                                {
                                    description: `### Output\n\n${
                                        string.trim() === ""
                                            ? "*No output*"
                                            : `\`\`\`${string}\`\`\``
                                    }`,
                                    color: 0x007bff,
                                    footer: {
                                        text: "The output is only visible to you for privacy reasons.",
                                    },
                                },
                            ],
                            ephemeral: true,
                        })
                        .catch(this.application.logger.debug);
                });

                collector.on("end", () => {
                    message
                        .edit({
                            embeds: [message.embeds[0]],
                            components: [],
                        })
                        .catch(this.application.logger.debug);
                });
            }
        } catch (error) {
            if ("stack" in (error as Error) && "message" in (error as Error)) {
                uncaughtErrorHandler(error as Error);
            } else {
                rejectionHandler(error);
            }
        }

        process.off("uncaughtException", uncaughtErrorHandler);
        process.off("unhandledRejection", rejectionHandler);
    }
}

export default EvalCommand;
