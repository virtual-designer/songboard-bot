import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../env/env";

class Database {
    public readonly drizzle: NodePgDatabase<Record<string, never>>;

    public constructor() {
        this.drizzle = this.createDrizzle();
    }

    private createConnection() {
        return new Pool({
            connectionString: env.DB_URL
        });
    }

    private createDrizzle() {
        return drizzle(this.createConnection());
    }
}

export default Database;