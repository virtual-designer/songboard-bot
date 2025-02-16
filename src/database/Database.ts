import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env/env";
import * as SongMessagesSchema from "../models/SongMessage";
import { sql } from "drizzle-orm";

class Database {
    public readonly drizzle: ReturnType<typeof this.createDrizzle>;

    public constructor() {
        this.drizzle = this.createDrizzle();
    }

    private createConnection() {
        return new Pool({
            connectionString: env.SONGBOARD_BOT_DB_URL,
        });
    }

    private createDrizzle() {
        const db = drizzle(this.createConnection(), {
            schema: {
                ...SongMessagesSchema,
            },
            logger: true
        });

	db.execute(sql`SELECT 1`).catch(console.error);

	return db;
    }
}

export default Database;
