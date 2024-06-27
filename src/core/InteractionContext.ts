import type {
    ChatInputCommandInteraction,
    GuildBasedChannel,
    GuildMember,
    MessageCreateOptions,
    MessagePayload,
} from "discord.js";
import { assertNotNull } from "../utils/utils";
import Context from "./Context";
import SendReplyPromise from "./SendReplyPromise";

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

    public get options() {
        return this._value.options;
    }

    public override reply(
        options: string | MessageCreateOptions | MessagePayload,
    ): SendReplyPromise {
        return new SendReplyPromise(this.value, options);
    }
}

export default InteractionContext;
