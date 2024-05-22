import type { Awaitable } from "discord.js";
import { glob } from "glob";

class ClassLoader {
    public async loadClass<T>(path: string) {
        const { default: targetClass } = await import(path);
        return targetClass as T;
    }

    public async loadClasses<T>(paths: string[]): Promise<T[]> {
        return await Promise.all(paths.map((path) => this.loadClass<T>(path)));
    }

    public async loadClassesFromGlob<T>(pattern: string) {
        const paths = await glob(pattern);
        return await this.loadClasses<T>(paths);
    }

    public async loadClassesFromDirectory<T>(directory: string) {
        return await this.loadClassesFromGlob<T>(`${directory}/**/*.{ts,js}`);
    }

    public async loadClassesFromDirectoryWithCallback<T>(
        directory: string,
        {
            onClassLoadEnd,
            onClassLoadStart,
            onLoadFinish,
            onLoadStart,
        }: LoadClassesFromDirectoryOptions<T>,
    ) {
        const files = await glob(`${directory}/**/*.{ts,js}`);
        await onLoadStart?.();

        for (const file of files) {
            await onClassLoadStart?.(file);
            const clazz = await this.loadClass<T>(file);
            await onClassLoadEnd?.(clazz, file);
        }

        await onLoadFinish?.();
    }
}

type LoadClassesFromDirectoryOptions<T> = {
    onLoadFinish?: () => Awaitable<void>;
    onClassLoadEnd?: (clazz: T, file: string) => Awaitable<void>;
    onClassLoadStart?: (file: string) => Awaitable<void>;
    onLoadStart?: () => Awaitable<void>;
};

export default ClassLoader;
