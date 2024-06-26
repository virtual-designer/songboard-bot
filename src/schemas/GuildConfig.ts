import { type } from "arktype";

export const GuildConfigSchema = type({
    prefix: ["string", "=", "$"],
    "songboard?": {
        enabled: "boolean",
        reaction_emoji: ["string", "=", "🎵"],
        channel: /^\d+$/,
        min_reactions: ["number", "=", 5],
        excluded_channels: ["string[]", "=", []],
    },
});

export const GuildConfigContainerSchema = type({
    "[string]": GuildConfigSchema,
});

export type GuildConfigType = typeof GuildConfigSchema.infer;
