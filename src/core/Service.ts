import type { Awaitable } from "discord.js";
import type Application from "./Application";

abstract class Service {
    public constructor(protected readonly application: Application) {}

    protected get logger() {
        return this.application.logger;
    }

    public boot?(): Awaitable<void>
}

export default Service;