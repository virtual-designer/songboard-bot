import type {
    AutocompleteInteraction,
    ChatInputCommandInteraction,
    Client,
    Interaction,
    Message,
    MessageCreateOptions,
    MessagePayload,
    TextBasedChannel,
    User,
} from "discord.js";
import { env } from "../env/env";

class SendReplyPromise extends Promise<Message<true>> {
    private _type: "error" | "success" | "default" = "default";
    private _client?: Client;

    public constructor(
        target:
            | Message<true>
            | Exclude<Interaction, AutocompleteInteraction>
            | TextBasedChannel
            | User
            | ChatInputCommandInteraction,
        options: string | MessagePayload | MessageCreateOptions,
    ) {
        if (typeof target === "function") {
            super(target);
            return;
        }

        super((resolve, reject) => {
            queueMicrotask(() => {
                if ("send" in target) {
                    target
                        .send(this.transformOptions(options))
                        .then((message) => resolve(message as Message<true>))
                        .catch(reject);
                } else {
                    (target as ChatInputCommandInteraction)
                        .reply(this.transformOptions(options))
                        .then((message) =>
                            resolve(message as unknown as Message<true>),
                        )
                        .catch(reject);
                }
            });
        });

        this._client = target.client;
    }

    private getEmoji(name: string) {
        return this._client?.guilds.cache
            .get(env.SONGBOARD_BOT_HOME_GUILD_ID)
            ?.emojis.cache.find((e) => e.name === name || e.identifier === name)
            ?.toString();
    }

    private transformOptions(
        options: string | MessagePayload | MessageCreateOptions,
    ) {
        const finalOptions = (typeof options === "string"
            ? { content: options, fetchReply: true }
            : { ...options, fetchReply: true }) as unknown as MessagePayload &
            MessageCreateOptions;

        if (this._type === "error") {
            finalOptions.content = `${this.getEmoji("error")} ${finalOptions.content}`;
        } else if (this._type === "success") {
            finalOptions.content = `${this.getEmoji("check")} ${finalOptions.content}`;
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
