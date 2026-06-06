import { auth } from "../src/lib/auth";

// 初期ユーザーを作成する。`npx prisma db seed` で実行（.env が読み込まれる）。
// 既にサインアップ画面からユーザーを作る場合は不要。
async function main() {
  const email = process.env.SEED_EMAIL ?? "demo@example.com";
  const password = process.env.SEED_PASSWORD ?? "password123";
  const name = process.env.SEED_NAME ?? "デモユーザー";

  try {
    await auth.api.signUpEmail({ body: { email, password, name } });
    console.log(`初期ユーザーを作成しました: ${email} / ${password}`);
  } catch (e) {
    console.log(
      `初期ユーザーの作成をスキップ（既に存在する可能性）: ${(e as Error).message}`,
    );
  }
}

main().finally(() => process.exit(0));
