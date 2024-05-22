import type Application from "./Application";
import type Service from "./Service";

class ServiceManager {
    private readonly services = new Map<string, Service>();
    public constructor(protected readonly application: Application) {}

    public addService<T extends Service>(service: T): void {
        this.services.set(Reflect.getMetadata(
            "service:name",
            service.constructor,
        ), service);
    }

    public getService<T extends keyof ApplicationServices>(name: T): ApplicationServices[T] {
        return this.services.get(name as string) as ApplicationServices[T];
    }

    public addServiceFromClass<T extends new (...args: unknown[]) => Service>(clazz: T): void {
        this.addService(new clazz(this.application));
    }
}

function Name(name: keyof ApplicationServices) {
    return function <T extends new (application: Application) => Service>(constructor: T) {
        Reflect.defineMetadata("service:name", name, constructor);
    };
}

export { Name, ServiceManager };
