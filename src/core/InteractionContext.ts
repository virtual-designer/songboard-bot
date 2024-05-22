import type { ChatInputCommandInteraction, GuildBasedChannel, GuildMember, InteractionReplyOptions, Message, MessageCreateOptions, MessagePayload } from "discord.js";
import { assertNotNull } from "../utils/utils";
import Context from "./Context";

class InteractionContext extends Context<ChatInputCommandInteraction> {
    public override get guild() {
        return assertNotNull(this._value.guild);
    }

    public override get guildId() {
        return assertNotNull(this._value.guildId);
    }

    public override get member() {
        return assertNotNull(this._value.member) as GuildMember;
    }

    public override get user() {
        return this.value.user;
    }

    public override get userId() {
        return this._value.user.id;
    }

    public override get channel() {
        return assertNotNull(this._value.channel) as GuildBasedChannel;
    }

    public override get channelId() {
        return assertNotNull(this._value.channelId);
    }

    public override async reply(options: string | MessageCreateOptions | MessagePayload) {
        return <Promise<Message<true>>> <unknown> this._value.reply(typeof options === "string" ? {content:options,fetchReply:true}:{...options,fetchReply:true} as InteractionReplyOptions);
    }
}

export default InteractionContext;