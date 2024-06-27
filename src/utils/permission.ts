import { env } from "../env/env";

const admins = env.SONGBOARD_BOT_SYSTEM_ADMINS.split(";");

export function isSystemAdmin(userId: string) {
    return !!admins.includes(userId);
}
