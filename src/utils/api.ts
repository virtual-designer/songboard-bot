import type { Client, Guild, TextBasedChannel } from "discord.js";

export const fetchChannel = async (guild: Guild, channelId: string) => {
    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
        try {
            return await guild.channels.fetch(channelId);
        } catch {
            return null;
        }
    }

    return channel;
};

export const fetchMessage = async (
    channel: TextBasedChannel,
    messageId: string,
) => {
    const message = channel.messages.cache.get(messageId);

    if (!message) {
        try {
            return await channel.messages.fetch(messageId);
        } catch {
            return null;
        }
    }

    return message;
};

export const fetchUser = async (client: Client, userId: string) => {
    const user = client.users.cache.get(userId);

    if (!user) {
        try {
            return await client.users.fetch(userId);
        } catch {
            return null;
        }
    }

    return user;
};
