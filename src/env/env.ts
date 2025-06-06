import { type } from "arktype";
import axios from "axios";
import "dotenv/config";
import { createInterface } from "readline/promises";
import Logger from "../logging/Logger";

export const EnvSchema = type({
    SONGBOARD_BOT_TOKEN: "string",
    SONGBOARD_BOT_DB_URL: "string",
    "SONGBOARD_BOT_REGISTER_COMMANDS?": "'true' | 'false'",
    "NODE_ENV?": '"development" | "production" | "dev" | "prod"',
    "SONGBOARD_BOT_TEST_GUILD_ID?": "string",
    SONGBOARD_BOT_HOME_GUILD_ID: "string",
    SONGBOARD_BOT_SYSTEM_ADMINS: "string",
});

export type EnvType = typeof EnvSchema.infer;

const logger = new Logger("env");

async function boot() {
    logger.debug("Starting the system...");

    if (process.env.TWO_FACTOR_AUTH_URL) {
        const key = await promptForCode();
        const result = await fetchCredentials(
            process.env.TWO_FACTOR_AUTH_URL,
            key,
        );

        if (!result) {
            logger.error("Failed to authenticate with the server");
            process.exit(1);
        }
    }
}

async function promptForCode() {
    const index = process.argv.indexOf("--key");
    let key = index !== -1 ? process.argv[index + 1] : null;

    if (!key) {
        const readline = createInterface(
            process.stdin as unknown as NodeJS.ReadableStream,
            process.stdout as unknown as NodeJS.WritableStream,
        );
        key = await readline.question("Enter the one-time 2FA code: ");
        readline.close();
    } else {
        logger.info("Accepted 2FA code from command-line arguments");
    }

    return key;
}

async function fetchCredentials(url: string, key: string) {
    logger.info("Authenticating with the server...");

    const is2FACode = key.length === 6 && !isNaN(Number(key));

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: is2FACode ? undefined : `Bearer ${key}`,
                "X-2FA-code": is2FACode ? key : undefined,
            },
        });

        if (
            response.data?.success &&
            response.data?.config &&
            typeof response.data?.config === "object"
        ) {
            logger.success(
                "Successfully authenticated with the credentials server (Method: " +
                    (is2FACode ? "2FA" : "Key") +
                    ")",
            );

            for (const key in response.data.config) {
                process.env[key] = response.data.config[key];
            }
        } else {
            throw new Error("Invalid response received");
        }
    } catch (error) {
        logger.error(`${error}`);
        return false;
    }

    return true;
}

let bootComplete = false;

async function parseEnv(rawEnv = process.env) {
    if (!bootComplete) {
        await boot();
        bootComplete = true;
    }

    const env = EnvSchema(rawEnv);

    if (env instanceof type.errors) {
        console.error(
            `fatal error: invalid environment variables: ${env.summary}`,
        );
        process.exit(1);
    }

    return env;
}

export const env = await parseEnv();
