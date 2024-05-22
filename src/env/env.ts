import { type, type inferTypeRoot } from "arktype";
import "dotenv/config";

export const EnvSchema = type({
    TOKEN: "string",
    DB_URL: "string",
    "NODE_ENV?": '"development" | "production" | "dev" | "prod"',
});

export type EnvType = inferTypeRoot<typeof EnvSchema>;

function parseEnv() {
    const env = EnvSchema(process.env);

    if (env instanceof type.errors) {
        console.error(
            `fatal error: invalid environment variables: ${env.message}`,
        );
        process.exit(1);
    }

    return env;
}

export const env = parseEnv();
