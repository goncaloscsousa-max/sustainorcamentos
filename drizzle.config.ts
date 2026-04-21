import { defineConfig } from "drizzle-kit";
import path from "node:path";

export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url:
      process.env.DATABASE_PATH ??
      path.join(process.cwd(), "data", "sustain.db"),
  },
  strict: true,
  verbose: true,
});
