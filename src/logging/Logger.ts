import ConsoleLogConsumer from "./ConsoleLogConsumer";
import type LogConsumer from "./LogConsumer";
import LogLevel from "./LogLevel";

class Logger {
    private static readonly cache = new Map<string, Logger>();
    private readonly name: string;
    private readonly consumer: LogConsumer;

    public constructor(
        name: string,
        consumer: LogConsumer = new ConsoleLogConsumer(),
    ) {
        this.name = name;
        this.consumer = consumer;
        this.component = this.component.bind(this);
        this.write = this.write.bind(this);
        this.debug = this.debug.bind(this);
        this.info = this.info.bind(this);
        this.warning = this.warning.bind(this);
        this.error = this.error.bind(this);
        this.fatal = this.fatal.bind(this);
        this.success = this.success.bind(this);
    }

    public component(componentName: string): Logger {
        const cachedLogger = Logger.cache.get(componentName);

        if (cachedLogger) {
            return cachedLogger;
        }

        const logger = new Logger(
            `${this.name}:${componentName}`,
            this.consumer,
        );

        Logger.cache.set(componentName, logger);
        return logger;
    }

    public write(level: LogLevel, ...messages: string[]): void {
        this.consumer.write(this.name, new Date(), null, level, ...messages);
    }

    public debug(...messages: string[]): void {
        this.write(LogLevel.Debug, ...messages);
    }

    public info(...messages: string[]): void {
        this.write(LogLevel.Info, ...messages);
    }

    public warning(...messages: string[]): void {
        this.write(LogLevel.Warning, ...messages);
    }

    public error(...messages: string[]): void {
        this.write(LogLevel.Error, ...messages);
    }

    public fatal(...messages: string[]): void {
        this.write(LogLevel.Fatal, ...messages);
    }

    public success(...messages: string[]): void {
        this.write(LogLevel.Success, ...messages);
    }
}

export default Logger;
