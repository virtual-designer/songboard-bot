import type { Guild, GuildBasedChannel, GuildMember, Message, MessageCreateOptions, MessagePayload, Snowflake, User } from "discord.js";

abstract class Context<T> {
    protected _value: T;
    
    public constructor(value: T) {
        this._value = value;
    }
    
    public get value(): T {
        return this._value;
    }

    public abstract get guild(): Guild
    public abstract get guildId(): Snowflake
    public abstract get member(): GuildMember
    public abstract get user(): User
    public abstract get userId(): Snowflake
    public abstract get channel(): GuildBasedChannel
    public abstract get channelId(): Snowflake

    public abstract reply(options: string | MessageCreateOptions | MessagePayload): Promise<Message>
}

export default Context;