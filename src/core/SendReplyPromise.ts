import type {
    ChatInputCommandInteraction,
    Message,
    MessageCreateOptions,
    MessagePayload,
    TextBasedChannel,
    User,
} from "discord.js";

class SendReplyPromise extends Promise<Message<true>> {
    private _type: "error" | "success" | "default" = "default";

    public constructor(
        target:
            | Message<true>
            | TextBasedChannel
            | User
            | ChatInputCommandInteraction,
        options: string | MessagePayload | MessageCreateOptions,
    ) {
        super((resolve, reject) => {
            queueMicrotask(() => {
                if ("send" in target) {
                    target
                        .send(this.transformOptions(options))
                        .then((message) => resolve(message as Message<true>))
                        .catch(reject);
                } else {
                    target
                        .reply(this.transformOptions(options))
                        .then((message) => resolve(message as Message<true>))
                        .catch(reject);
                }
            });
        });
    }

    private transformOptions(
        options: string | MessagePayload | MessageCreateOptions,
    ) {
        const finalOptions = (typeof options === "string"
            ? { content: options, fetchReply: true }
            : { ...options, fetchReply: true }) as unknown as MessagePayload &
            MessageCreateOptions;

        if (this._type === "error") {
            finalOptions.content = `:x: ${finalOptions.content}`;
        } else if (this._type === "success") {
            finalOptions.content = `✅ ${finalOptions.content}`;
        }

        return finalOptions;
    }

    public error() {
        this._type = "error";
        return this;
    }

    public success() {
        this._type = "success";
        return this;
    }

    public get type() {
        return this._type;
    }
}

export default SendReplyPromise;
