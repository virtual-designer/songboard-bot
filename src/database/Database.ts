import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env/env";
import * as SongMessagesSchema from "../models/SongMessage";

class Database {
    public readonly drizzle: ReturnType<typeof this.createDrizzle>;

    public constructor() {
        this.drizzle = this.createDrizzle();
    }

    private createConnection() {
        return new Pool({
            connectionString: env.DB_URL,
        });
    }

    private createDrizzle() {
        return drizzle(this.createConnection(), {
            schema: {
                ...SongMessagesSchema,
            },
        });
    }
}

export default Database;
