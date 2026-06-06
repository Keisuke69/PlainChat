import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { account, session, user, verification } from "./schema";

// Better Auth サーバ設定。email & password のみのシンプル構成。
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    // Better Auth の内部モデル名(user/session/account/verification)を
    // Drizzle テーブルへ明示マップ（テーブル名は既存 DB と同じ大文字始まり）。
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
    // 検証用ツールのためメール確認は不要にしておく
    requireEmailVerification: false,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
});
