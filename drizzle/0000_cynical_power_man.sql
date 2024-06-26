CREATE TABLE IF NOT EXISTS "song_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"songs" text[] NOT NULL,
	"message_id" text NOT NULL,
	"songboard_message_id" text NOT NULL,
	"songboard_song_message_id" text,
	"channel_id" text NOT NULL,
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"upvotes" text[] DEFAULT '{}' NOT NULL,
	"downvotes" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
