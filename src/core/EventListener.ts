import type { Awaitable, ClientEvents } from "discord.js";
import type Application from "./Application";

abstract class EventListener<T extends keyof ClientEvents> {
    public abstract readonly name: T;
    public constructor(protected readonly application: Application) {}
    public abstract execute(...args: ClientEvents[T]): Awaitable<void>;
}

export default EventListener;
