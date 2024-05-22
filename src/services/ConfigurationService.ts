import { type } from "arktype";
import { Awaitable } from "discord.js";
import fs from "fs/promises";
import path from "path";
import Application from "../core/Application";
import Service from "../core/Service";
import { Name } from "../core/ServiceManager";
import { GuildConfigContainerSchema, GuildConfigSchema, GuildConfigType } from "../schemas/GuildConfig";

declare global {
    interface ApplicationServices {
        configurationService: ConfigurationService;
    }
}

@Name("configurationService")
class ConfigurationService extends Service {
    private static readonly GUILD_CONFIGURATION_FILE_PATH = path.resolve(__dirname, "../../config/config.json");
    private _guildJson: Record<string, GuildConfigType | undefined> = {};
    private _defaultGuildConfig: GuildConfigType;

    public override boot(): Awaitable<void> {
        return this.load();
    }

    public constructor(application: Application) {
        super(application);
        const defaultGuildConfig = GuildConfigSchema({});

        if (defaultGuildConfig instanceof type.errors) {
            throw new Error("Invalid default guild config");
        }

        this._defaultGuildConfig = defaultGuildConfig;
    }

    public forGuild(id: string): GuildConfigType {
        return this._guildJson[id] ?? this._defaultGuildConfig;
    }

    public async load() {
        const contents = await fs.readFile(ConfigurationService.GUILD_CONFIGURATION_FILE_PATH, { encoding: "utf-8" });
        const guildJson = JSON.parse(contents);
        const parsed = GuildConfigContainerSchema(guildJson);

        if (parsed instanceof type.errors) {
            this.logger.fatal("Invalid config values found in config.json");
            throw new Error("Invalid config values found in config.json");
        }

        this._guildJson = parsed;
        this.logger.info("Loaded configuration from file: ", ConfigurationService.GUILD_CONFIGURATION_FILE_PATH);
    }
}

export default ConfigurationService;