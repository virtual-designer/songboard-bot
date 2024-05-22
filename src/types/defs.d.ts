import type Service from "../core/Service";

declare global {
    interface ApplicationServices extends Record<string, Service> {
    }
}