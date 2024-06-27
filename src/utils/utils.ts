import { env } from "../env/env";

export const isDevMode = () =>
    env.NODE_ENV === "development" || env.NODE_ENV === "dev";

export const assertNotNull = <T>(value: T | null | undefined): T => {
    if (value === null || value === undefined) {
        throw new Error("Value is null or undefined");
    }

    return value;
};

export function preformat(args: TemplateStringsArray, ...parts: unknown[]) {
    let fullString = "";

    for (const part of args) {
        fullString += part + (parts.shift() ?? "");
    }

    return fullString.replace(/^\s+|\s*\n$/gm, "");
}

export const f = preformat;
