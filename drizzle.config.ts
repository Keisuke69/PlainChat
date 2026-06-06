import { defineConfig } from "drizzle-kit";

// DATABASE_URL は Prisma 互換の "file:..." 形式。drizzle-kit/better-sqlite3 は
// ファイルパスを取るため "file:" を除く。未設定時は .env と同じ既定値にフォールバック。
const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: { url },
});
