import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { readdirSync } from "fs";
import path from "path";

export default defineConfig({
    dialect: "postgresql",
    out: "./drizzle",
    schema: readdirSync(path.resolve(__dirname, "src/models")).map((file) =>
        path.resolve(__dirname, "src/models", file),
    ),
    dbCredentials: {
        url: process.env.SONGBOARD_BOT_DB_URL!,
    },
    // Print all statements
    verbose: true,
    // Always ask for confirmation
    strict: true,
});
