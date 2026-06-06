# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PlainChat — OpenAI / Anthropic の API モデルを切り替えて使える、ローカル実行のシンプルな日本語チャット。本番プロダクトと同じ Vercel AI SDK を採用し、**API モデルでのプロンプト挙動を忠実に検証する**ことが目的（ChatGPT のチャット機能だけを切り出したクローン）。UI 文言・ドキュメント・コードコメントはすべて日本語。

## コマンド

| 用途 | コマンド |
|---|---|
| 開発サーバ | `npm run dev`（http://localhost:3000） |
| 本番ビルド | `npm run build`（`next build` のみ。コード生成ステップは無し） |
| 本番起動 | `npm run start` |
| Lint | `npm run lint`（next lint / ESLint） |
| マイグレーション生成 | `npm run db:generate`（`drizzle-kit generate`。`src/lib/schema.ts` から SQL を生成） |
| マイグレーション適用 | `npm run db:migrate`（`drizzle-kit migrate`） |
| スキーマを DB に直接反映 | `npm run db:push`（`drizzle-kit push`） |
| 初期ユーザー作成 | `npm run db:seed`（`scripts/seed.ts` / demo@example.com / password123） |
| 履歴を GUI 閲覧 | `npm run db:studio`（Drizzle Studio, port 4983） |

- テストフレームワークは未導入（`test` スクリプトは存在しない）。
- `src/lib/schema.ts`（Drizzle スキーマ）を変更したら `npm run db:generate` で `drizzle/` にマイグレーション SQL を生成し、`npm run db:migrate` で適用する。**Prisma と違いコード生成（クライアント再生成）は不要**。

## 開発ワークフロー（Git / PR）

- **すべての変更は例外なくブランチ + PR で行う**。新機能だけでなく、ドキュメントや設定ファイルの軽微な修正・1行の typo 修正であっても、**`git worktree` で新しいブランチを切って作業**し、`main` に対して **Pull Request を作成**する。**`main` へ直接コミットしてはならない**。
  - 注: Claude Code on the web のように、セッションごとに隔離環境＋専用ブランチが用意される環境では、ハーネスのブランチ運用に従ってよい（手動 `git worktree` は不要なことがある）。いずれの環境でも「main 直接コミット禁止・PR 経由」は守る。
- 一連の作業が完了したら **コミット → プッシュ → PR 作成** まで行う。
- **後片付け**（PR 作成でセッションが終わる場合、マージ検知は同一セッション内では行えない前提）:
  - **リモートの作業ブランチ**: GitHub の「Automatically delete head branches」を有効化済みのため、マージ時に自動削除される（手動操作不要）。
  - **ローカルの worktree / ブランチ**: 次回このリポジトリで作業を開始した際にマージ済みを検知し、`git worktree remove <path>` / `git branch -d <branch>` で掃除する。

## 環境変数（`.env`）

Next が `.env` を自動読込する（Drizzle Kit は `drizzle.config.ts` で `DATABASE_URL` を参照し、未設定時は `file:./dev.db` にフォールバック）。DevContainer 利用時は `.devcontainer/post-create.sh` → `scripts/setup-env.mjs` がランダムシークレット付きで自動生成する。手動セットアップ時は `.env.example` をコピーして埋める。

- `DATABASE_URL` — SQLite の場所（例 `file:./dev.db`）。`db.ts` / `drizzle.config.ts` が先頭の `file:` を除いて better-sqlite3 に渡す。**パスは cwd（リポジトリ直下）基準で解決**される（Prisma 時代は schema ディレクトリ基準だったため、DB は `prisma/dev.db` ではなくリポジトリ直下の `dev.db` になる）
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — Better Auth 用
- `ENCRYPTION_KEY` — API キー暗号化鍵。**失うと保存済み API キーは復号不能**（再登録が必要）
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — 任意。UI でキー未設定時のフォールバック

`.env` と SQLite ファイル（`*.db` / `dev.db`）は `.gitignore` 済み（コミット禁止）。

## アーキテクチャの要点

Next.js (App Router) の単一プロセスでフロント + API を提供。Better Auth（email/password）+ Drizzle ORM / SQLite（better-sqlite3）。import エイリアス `@/*` → `src/*`。

### 1. モデル能力レジストリが中核（最重要）

`src/lib/model-registry.ts` が**単一の真実のソース**。各モデルの `supports`（`temperature` / `topP` / `maxTokens` / `thinkingEffort`）を宣言し、これが次の両方を駆動する:

- **UI**: `ModelSelector` / `SettingsPanel` が、そのモデルで有効なコントロールだけを表示
- **送信**: `src/lib/params.ts` の `resolveParams()`（プロバイダー非依存の中立形）が**非対応パラメータを除去**。SDK 経路は `normalizeParams()` で `streamText` 形へ、直接経路（`src/lib/direct.ts`）は各社 SDK のパラメータ名へ写像する。→ **どちらの実行方法でも同じレジストリ定義で正規化される**

理由: **Claude Opus 4.8 / 4.7 は temperature / top_p / top_k を送ると 400 エラー**になる（sampling 系が撤廃済み）。レジストリで非対応 param を「UI に出さない・API に送らない」ことで、API エラーと検証ノイズを防ぐ。→ **モデル追加 = `MODELS` 配列に 1 エントリ足すだけ**。`supports` の正確さがそのまま API 互換性に直結する。

レジストリは実行方法（トランスポート）の定義も保持する: `TransportId`（`sdk` | `direct`）・`TRANSPORTS`・`TRANSPORT_LABELS`・`isTransportId()`。UI 切替と送信経路の両方をここから駆動する。

注意: `effort`（Anthropic 4.x 系）は現状**UI 表示のみで SDK へは未送信**（`params.ts` のコメント参照。将来 `providerOptions` 経由で対応予定）。

### 2. チャットリクエストフロー（`src/app/api/chat/route.ts`）

`POST` で順に: セッション検証（Better Auth）→ 会話の所有者チェック → API キー解決 → 末尾の user メッセージを保存 → 会話の provider/model/**transport**/systemPrompt/params とタイトルを更新 → **`transport` で実行方法を分岐**:

- **`sdk`（既定）**: `buildLanguageModel` でユーザーのキーから**都度プロバイダーを生成** → `streamText`（`normalizeParams` 適用）→ `toUIMessageStreamResponse()`。
- **`direct`**: `src/lib/direct.ts` の `streamDirect()` が `openai` / `@anthropic-ai/sdk` で **API を直接呼び出し**、出力を `createUIMessageStream` で **UI message stream プロトコルへ橋渡し**（クライアントの `useChat` は無改修）。

どちらも `onFinish`（直接経路は共有コールバック `persistAssistant`）で assistant メッセージ + usage を保存。会話タイトルは最初の user メッセージ先頭 40 文字から自動生成。

### 3. API キー管理（ユーザー単位 + at rest 暗号化）

- `src/lib/crypto.ts`: AES-256-GCM。`ENCRYPTION_KEY` を SHA-256 で 32 バイト鍵に導出。保存形式は `base64(iv[12] | authTag[16] | ciphertext)`。
- `src/lib/keys.ts` `resolveApiKey()`: 解決順は **ユーザー保存キー（復号）→ env フォールバック → null**。復号失敗時もフォールバックに落ちる。
- `src/lib/provider.ts` `buildLanguageModel()`: グローバルな SDK クライアントは持たず、**リクエストごとにユーザーのキーで** `createOpenAI` / `createAnthropic` を生成する。
- **生キーはクライアントへ返さない**。設定画面には status + 下4桁マスクのみ返す（`getKeyStatuses`）。復号はサーバ側 Route Handler 内でのみ行う。

### 4. データモデル（`src/lib/schema.ts` = Drizzle スキーマ）

Better Auth 標準テーブル（User / Session / Account / Verification）+ アプリ用（Conversation / Message / ProviderKey）。**SQLite は Json 型非対応のため、`Conversation.params` と `Message.usage` は JSON 文字列（`text`）として保存**（読み書きで `JSON.parse` / `JSON.stringify`）。会話ごとに provider / model / transport / systemPrompt / params を保存し、「どの設定で何を試したか」を後から再現できる（検証用途の肝）。`Conversation.transport` は API 実行方法（`'sdk'` | `'direct'`、既定 `'sdk'`）。`ProviderKey` は `(userId, provider)` でユニーク。

互換性の要点（Prisma からの移行）: **テーブル名・カラム名は Prisma 版と同一**に保ち、`DateTime` は `integer({ mode: "timestamp_ms" })`（= Prisma ネイティブ SQLite と同じ Unix エポック ms）、真偽値は `integer({ mode: "boolean" })`（0/1）で保存する。これにより既存の `dev.db` をそのまま読み書きできる。`createdAt` は `$defaultFn`、`updatedAt` は `$onUpdate`（= Prisma の `@default(now())` / `@updatedAt` 相当）、アプリ表の `id` は `randomUUID()` を `$defaultFn` で生成。マイグレーション SQL は `drizzle/` 配下（`drizzle-kit generate` が生成）。

### 5. DB クライアント（`src/lib/db.ts`）

`better-sqlite3` 接続を生成し `drizzle(sqlite, { schema })` でラップ。dev のホットリロードで接続が増殖しないよう `globalThis` に保持する。新規にインスタンス化せず、必ずこの `db` を import すること。**接続生成時に `PRAGMA foreign_keys = ON` を設定**している（better-sqlite3 は既定で外部キーを強制しないため、会話削除時のメッセージ連鎖削除など `onDelete: cascade` を効かせるのに必須）。Better Auth は `drizzleAdapter(db, { provider: "sqlite", schema: { user, session, account, verification } })` でこの `db` を共有する。

## 注意点

`docs/DESIGN.md` / `docs/ADR.md` は設計時の記述で、一部が実ファイルとずれている（例: `models.ts` → 実際は `model-registry.ts`、`ChatPane/MessageList/MessageInput` → 実際は単一の `ChatApp.tsx`、`.env.local` → 実際は `.env`）。**実装は `src/` を正とすること**。docs は設計意図・トレードオフの理解に使う。
