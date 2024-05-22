import { env } from "../env/env";

export const isDevMode = () =>
    env.NODE_ENV === "development" || env.NODE_ENV === "dev";
