import axios from "axios";
import type { ClientEvents } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { createInterface } from "readline/promises";
import Database from "../database/Database";
import { env } from "../env/env";
import Logger from "../logging/Logger";
import { isDevMode } from "../utils/utils";
import ClassLoader from "./ClassLoader";
import type Command from "./Command";
import type EventListener from "./EventListener";
import type Service from "./Service";
import { ServiceManager } from "./ServiceManager";

class Application {
    private static EVENT_LISTENERS_DIRECTORY = path.resolve(
        __dirname,
        "../events",
    );
    private static COMMANDS_DIRECTORY = path.resolve(__dirname, "../commands");
    private static SERVICES_DIRECTORY = path.resolve(__dirname, "../services");

    public readonly client: Client<true>;
    public readonly logger = new Logger("system");
    public readonly classLoader = new ClassLoader();
    public readonly database = new Database();
    public readonly serviceManager = new ServiceManager(this);

    public constructor() {
        this.client = this.createClient() as Client<true>;
    }

    private createClient() {
        return new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.MessageContent,
            ],
        });
    }

    public async boot() {
        await this.preboot();
        this.logger.info("Starting up");

        if (isDevMode()) {
            this.client.on("debug", (message) => {
                this.logger.component("discord").debug(message);
            });
        }

        await this.loadServices();
        await this.loadEvents();
        await this.loadCommands();
        this.logger.info("System startup completed");
    }

    private async preboot() {
        this.logger.debug("Starting the kernel...");

        if (process.env.TWO_FACTOR_AUTH_URL) {
            const key = await this.promptForCode();
            const result = await this.fetchCredentials(
                process.env.TWO_FACTOR_AUTH_URL,
                key,
            );

            if (!result) {
                this.abort();
            }
        }
    }

    protected async promptForCode() {
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
            this.logger.info("Accepted 2FA code from command-line arguments");
        }

        return key;
    }

    protected async fetchCredentials(url: string, key: string) {
        this.logger.info("Authenticating with the server...");

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
                this.logger.success(
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
            this.logger.error(`${error}`);
            return false;
        }

        return true;
    }

    protected abort() {
        this.logger.fatal("Kernel boot aborted");
        process.exit(-1);
    }

    public async loadServices() {
        await this.classLoader.loadClassesFromDirectoryWithCallback<
            new (application: Application) => Service
        >(Application.SERVICES_DIRECTORY, {
            onClassLoadStart: (file) => {
                this.logger.debug(
                    `Loading service: ${path.basename(file).split(".")[0]}`,
                );
            },
            onClassLoadEnd: async (clazz) => {
                const service = new clazz(this);
                await service.boot?.();
                this.serviceManager.addService(service);
                this.logger.info(
                    `Loaded service: ${service.constructor.name} (as ${Reflect.getMetadata("service:name", service.constructor)})`,
                );
            },
        });
    }

    public async loadEvents() {
        await this.classLoader.loadClassesFromDirectoryWithCallback<
            new (application: Application) => EventListener<keyof ClientEvents>
        >(Application.EVENT_LISTENERS_DIRECTORY, {
            onClassLoadStart: (file) => {
                this.logger.debug(
                    `Loading event listener: ${path.basename(file).split(".")[0]}`,
                );
            },
            onClassLoadEnd: (clazz) => {
                const eventListener = new clazz(this);

                this.client.on(
                    eventListener.name,
                    eventListener.execute.bind(eventListener),
                );

                this.logger.info(
                    `Loaded event listener: ${eventListener.name}`,
                );
            },
        });
    }

    public async loadCommands() {
        await this.classLoader.loadClassesFromDirectoryWithCallback<
            new (application: Application) => Command
        >(Application.COMMANDS_DIRECTORY, {
            onClassLoadStart: (file) => {
                this.logger.debug(
                    `Loading command: ${path.basename(file).split(".")[0]}`,
                );
            },
            onClassLoadEnd: (clazz) => {
                const command = new clazz(this);
                this.service("commandManager").addCommand(command);
                this.logger.info(`Loaded command: ${command.name}`);
            },
        });
    }

    public async start() {
        await this.client.login(env.TOKEN);
    }

    public get drizzle() {
        return this.database.drizzle;
    }

    public service<T extends keyof ApplicationServices>(
        name: T,
    ): ApplicationServices[T] {
        return this.serviceManager.getService<T>(name);
    }
}

export default Application;
