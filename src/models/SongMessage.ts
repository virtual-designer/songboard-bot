import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const songMessages = pgTable("song_messages", {
    id: serial("id").primaryKey(),
    songs: text("songs").notNull().array().notNull(),
    messageId: text("message_id").notNull(),
    songboardMessageId: text("songboard_message_id").notNull(),
    songboardSongMessageId: text("songboard_song_message_id"),
    channelId: text("channel_id").notNull(),
    guildId: text("guild_id").notNull(),
    userId: text("user_id").notNull(),
    upvotes: text("upvotes")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    downvotes: text("downvotes")
        .notNull()
        .array()
        .notNull()
        .default(sql`'{}'`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export type SongMessage = typeof songMessages.$inferSelect;
export type CreateSongMessagePayload = typeof songMessages.$inferInsert;
