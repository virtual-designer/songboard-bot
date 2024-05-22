import { type } from "arktype";

export const GuildConfigSchema = type({
    "prefix": ["string", "=", "$"],
});

export const GuildConfigContainerSchema = type({
    "[string]": GuildConfigSchema
});

export type GuildConfigType = typeof GuildConfigSchema.infer