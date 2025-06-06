import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const starboardMessages = pgTable("starboard_messages", {
    id: serial("id").primaryKey(),
    starboardMessageId: text("starboard_message_id").notNull(),
    messageId: text("message_id").notNull(),
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

export type StarboardMessage = typeof starboardMessages.$inferSelect;
export type CreateStarboardMessagePayload =
    typeof starboardMessages.$inferInsert;
