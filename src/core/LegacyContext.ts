import type { Message, MessageCreateOptions, MessagePayload } from "discord.js";
import { assertNotNull } from "../utils/utils";
import Context from "./Context";
import SendReplyPromise from "./SendReplyPromise";

class LegacyContext extends Context<Message<true>> {
    protected readonly args: readonly string[];

    public constructor(
        value: Message<true>,
        protected readonly argv: readonly string[],
    ) {
        super(value);
        this.args = argv.slice(1);
    }

    public override get guild() {
        return this._value.guild;
    }

    public override get guildId() {
        return this._value.guildId;
    }

    public override get member() {
        return assertNotNull(this._value.member);
    }

    public override get user() {
        return this._value.author;
    }

    public override get userId() {
        return this._value.author.id;
    }

    public override get channel() {
        return this._value.channel;
    }

    public override get channelId() {
        return this._value.channelId;
    }

    public override reply(
        options: string | MessageCreateOptions | MessagePayload,
    ): SendReplyPromise {
        return new SendReplyPromise(this.value, options);
    }

    public get commandName() {
        return this.argv[0];
    }
}

export default LegacyContext;
