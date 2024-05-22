import chalk from "chalk";
import type LogConsumer from "./LogConsumer";
import LogLevel from "./LogLevel";

class ConsoleLogConsumer implements LogConsumer {
    private static logLevelToConsoleMethod = {
        [LogLevel.Debug]: console.debug,
        [LogLevel.Info]: console.info,
        [LogLevel.Warning]: console.warn,
        [LogLevel.Error]: console.error,
        [LogLevel.Fatal]: console.error,
        [LogLevel.Success]: console.log,
    };

    private static logLevelColors = {
        [LogLevel.Debug]: chalk.gray.dim,
        [LogLevel.Info]: chalk.blue.bold,
        [LogLevel.Warning]: chalk.yellow,
        [LogLevel.Error]: chalk.red,
        [LogLevel.Fatal]: chalk.red.bold,
        [LogLevel.Success]: chalk.green,
    };

    public write(
        loggerName: string,
        date: Date,
        componentName: string | null,
        level: LogLevel,
        ...messages: string[]
    ): void {
        const formattedDate = date.toISOString();
        const formattedLevel = LogLevel[level].toLowerCase();
        const formattedComponent = componentName ? `[${componentName}]` : "";
        const formattedMessages = messages.join(" ");

        ConsoleLogConsumer.logLevelToConsoleMethod[level].call(
            console,
            `${chalk.white.dim(formattedDate)} ${ConsoleLogConsumer.logLevelColors[level](`[${loggerName}:${formattedLevel}]`)}${" ".repeat(7 - formattedLevel.length)} ${formattedComponent} ${formattedMessages}`,
        );
    }
}

export default ConsoleLogConsumer;
