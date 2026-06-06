// Drizzle スキーマ — SQLite ローカル DB
// Better Auth 標準テーブル(User/Session/Account/Verification) + アプリ用(Conversation/Message/ProviderKey)
//
// 互換性メモ:
// - テーブル名/カラム名は Prisma 版と同一（既存の dev.db をそのまま読み書きできる）。
// - DateTime は Prisma のネイティブ SQLite ドライバと同じ「Unix エポックのミリ秒(integer)」で
//   保存するため `mode: "timestamp_ms"` を使う（既存データと相互運用可能）。
// - 真偽値は 0/1 の integer（Prisma の BOOLEAN と同一表現）。
import { randomUUID } from "node:crypto";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

// timestamp 系カラムの共通定義（作成時刻 / 更新時刻）
const createdAt = () =>
  integer("createdAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date());

const updatedAt = () =>
  integer("updatedAt", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date());

// ===== Better Auth 標準テーブル =====

export const user = sqliteTable("User", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "boolean" })
    .notNull()
    .default(false),
  image: text("image"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const session = sqliteTable("Session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("Account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: integer("accessTokenExpiresAt", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refreshTokenExpiresAt", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const verification = sqliteTable("Verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expiresAt", { mode: "timestamp_ms" }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ===== アプリ用テーブル =====

export const conversation = sqliteTable(
  "Conversation",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("新しいチャット"),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    // 会話ごとの API 実行方法（'sdk' | 'direct'）
    transport: text("transport").notNull().default("sdk"),
    systemPrompt: text("systemPrompt").notNull().default(""),
    // SQLite は Json 非対応のため JSON 文字列で保存
    params: text("params").notNull().default("{}"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("Conversation_userId_idx").on(t.userId)],
);

export const message = sqliteTable(
  "Message",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    conversationId: text("conversationId")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // 'user' | 'assistant' | 'system'
    content: text("content").notNull(),
    model: text("model"),
    usage: text("usage"), // JSON 文字列
    createdAt: createdAt(),
  },
  (t) => [index("Message_conversationId_idx").on(t.conversationId)],
);

export const providerKey = sqliteTable(
  "ProviderKey",
  {
    id: text("id").primaryKey().$defaultFn(() => randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(), // 'openai' | 'anthropic'
    encryptedKey: text("encryptedKey").notNull(),
    last4: text("last4").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("ProviderKey_userId_provider_key").on(t.userId, t.provider)],
);
