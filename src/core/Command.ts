import type {
    Awaitable,
    ChatInputCommandInteraction,
    Message,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import type Application from "./Application";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";

export type Buildable =
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder;

abstract class Command {
    public readonly drizzle: Application["drizzle"];
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly usage: string[];
    public readonly aliases: string[] = [];
    public readonly category?: string;
    public readonly supportedContexts: CommandContextType[] = [
        CommandContextType.Message,
        CommandContextType.CommandInteraction,
    ];

    public constructor(protected readonly application: Application) {
        this.drizzle = application.database.drizzle;
    }

    protected get logger() {
        return this.application.logger;
    }

    public build(): Buildable[] {
        if (
            this.supportedContexts.includes(
                CommandContextType.CommandInteraction,
            )
        ) {
            return [this.buildChatInput()];
        }

        return [];
    }

    protected buildChatInput(): SlashCommandBuilder {
        return new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
            .setDMPermission(false);
    }

    public abstract execute(
        context: Context<Message | ChatInputCommandInteraction>,
    ): Awaitable<void>;
}

export default Command;
