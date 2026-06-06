import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// DATABASE_URL は Prisma 互換の "file:..." 形式。better-sqlite3 はファイルパスを
// 受け取るため、先頭の "file:" を除いた相対/絶対パスに変換する。
const dbPath = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");

// 開発時のホットリロードで接続が増殖しないようグローバルに保持
const globalForDb = globalThis as unknown as {
  sqlite?: Database.Database;
  db?: ReturnType<typeof drizzle<typeof schema>>;
};

const sqlite =
  globalForDb.sqlite ??
  (() => {
    const conn = new Database(dbPath);
    // better-sqlite3 は既定で外部キーを強制しないため有効化する
    // （会話削除時のメッセージ連鎖削除など onDelete: cascade を効かせるのに必須）
    conn.pragma("foreign_keys = ON");
    return conn;
  })();

export const db = globalForDb.db ?? drizzle(sqlite, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlite = sqlite;
  globalForDb.db = db;
}
