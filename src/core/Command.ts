import type {
    Awaitable,
    ChatInputCommandInteraction,
    Message,
    SlashCommandOptionsOnlyBuilder,
    SlashCommandSubcommandsOnlyBuilder,
} from "discord.js";
import { SlashCommandBuilder } from "discord.js";
import { env } from "../env/env";
import { isSystemAdmin } from "../utils/permission";
import type Application from "./Application";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";
import type InteractionContext from "./InteractionContext";
import type LegacyContext from "./LegacyContext";

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
    public readonly systemAdminOnly: boolean = false;

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

    protected emoji(name: string) {
        return this.application.client.guilds.cache
            .get(env.SONGBOARD_BOT_HOME_GUILD_ID)
            ?.emojis.cache.find((e) => e.name === name || e.identifier === name)
            ?.toString();
    }

    public abstract execute(
        context: Context<Message | ChatInputCommandInteraction>,
    ): Awaitable<void>;

    public async run(
        context: LegacyContext | InteractionContext,
    ): Promise<void> {
        if (this.systemAdminOnly && !isSystemAdmin(context.user.id)) {
            await context
                .reply("You do not have permission to run this command.")
                .error();
            return;
        }

        await this.execute(context);
    }
}

export default Command;
