import type LogLevel from "./LogLevel";

interface LogConsumer {
    write(
        loggerName: string,
        date: Date,
        componentName: string | null,
        level: LogLevel,
        ...messages: string[]
    ): void;
}

export default LogConsumer;
