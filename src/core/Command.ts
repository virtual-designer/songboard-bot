import type { Awaitable, ChatInputCommandInteraction, Message } from "discord.js";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type Application from "./Application";
import CommandContextType from "./CommandContextType";
import type Context from "./Context";

abstract class Command {
    public readonly drizzle: NodePgDatabase<Record<string, never>>;
    public abstract readonly name: string;
    public abstract readonly description: string;
    public abstract readonly usage: string[];
    public readonly aliases: string[] = [];
    public readonly category?: string;
    public readonly supportedContexts: CommandContextType[] = [CommandContextType.Message,CommandContextType.CommandInteraction];

    public constructor(protected readonly application: Application) {
        this.drizzle = application.database.drizzle;
    }

    protected get logger() {
        return this.application.logger;
    }

    public abstract execute(context: Context<Message | ChatInputCommandInteraction>): Awaitable<void>;
}

export default Command;