import { env } from "../env/env";

export const isDevMode = () =>
    env.NODE_ENV === "development" || env.NODE_ENV === "dev";

export const assertNotNull = <T>(value: T | null | undefined): T => {
    if (value === null || value === undefined) {
        throw new Error("Value is null or undefined");
    }

    return value;
};