import type { ClientEvents } from "discord.js";
import { Client, GatewayIntentBits } from "discord.js";
import path from "path";
import { env } from "../env/env";
import Logger from "../logging/Logger";
import { isDevMode } from "../utils/utils";
import ClassLoader from "./ClassLoader";
import type EventListener from "./EventListener";

class Application {
    private static EVENT_LISTENERS_DIRECTORY = path.resolve(
        __dirname,
        "../events",
    );
    private static COMMANDS_DIRECTORY = path.resolve(__dirname, "../commands");

    public readonly client: Client;
    public readonly logger = new Logger("system");
    public readonly classLoader = new ClassLoader();

    public constructor() {
        this.client = this.createClient();
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
        this.logger.info("Starting up");

        if (isDevMode()) {
            this.client.on("debug", (message) => {
                this.logger.component("discord").debug(message);
            });
        }

        await this.loadEvents();
        await this.loadCommands();
        this.logger.info("System startup completed");
    }

    public async loadEvents() {
        await this.classLoader.loadClassesFromDirectoryWithCallback<
            new (application: Application) => EventListener<keyof ClientEvents>
        >(Application.EVENT_LISTENERS_DIRECTORY, {
            onClassLoadStart: (file) => {
                this.logger.debug(
                    `Loading event listener: ${path.basename(file)}`,
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
        // TODO: Implement command loading
    }

    public async start() {
        await this.client.login(env.TOKEN);
    }
}

export default Application;
