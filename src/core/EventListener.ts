import type { Awaitable, ClientEvents } from "discord.js";
import type Application from "./Application";

abstract class EventListener<T extends keyof ClientEvents | "raw"> {
    public abstract readonly name: T;
    public constructor(protected readonly application: Application) {}
    public abstract execute(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...args: T extends keyof ClientEvents ? ClientEvents[T] : any[]
    ): Awaitable<void>;
}

export default EventListener;
