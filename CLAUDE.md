# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

PlainChat — OpenAI / Anthropic の API モデルを切り替えて使える、ローカル実行のシンプルな日本語チャット。本番プロダクトと同じ Vercel AI SDK を採用し、**API モデルでのプロンプト挙動を忠実に検証する**ことが目的（ChatGPT のチャット機能だけを切り出したクローン）。UI 文言・ドキュメント・コードコメントはすべて日本語。

## コマンド

| 用途 | コマンド |
|---|---|
| 開発サーバ | `npm run dev`（http://localhost:3000） |
| 本番ビルド | `npm run build`（`prisma generate` → `next build`） |
| 本番起動 | `npm run start` |
| Lint | `npm run lint`（next lint / ESLint） |
| マイグレーション作成・適用 | `npm run db:migrate`（`prisma migrate dev`） |
| スキーマを DB に直接反映 | `npm run db:push` |
| 初期ユーザー作成 | `npm run db:seed`（demo@example.com / password123） |
| 履歴を GUI 閲覧 | `npm run db:studio`（Prisma Studio, port 5555） |

- テストフレームワークは未導入（`test` スクリプトは存在しない）。
- `prisma/schema.prisma` を変更したら `npx prisma generate`（または `npm run build`）で Prisma Client を再生成すること。

## 開発ワークフロー（Git / PR）

- **すべての変更は例外なくブランチ + PR で行う**。新機能だけでなく、ドキュメントや設定ファイルの軽微な修正・1行の typo 修正であっても、**`git worktree` で新しいブランチを切って作業**し、`main` に対して **Pull Request を作成**する。**`main` へ直接コミットしてはならない**。
  - 注: Claude Code on the web のように、セッションごとに隔離環境＋専用ブランチが用意される環境では、ハーネスのブランチ運用に従ってよい（手動 `git worktree` は不要なことがある）。いずれの環境でも「main 直接コミット禁止・PR 経由」は守る。
- 一連の作業が完了したら **コミット → プッシュ → PR 作成** まで行う。
- **コミットの author は必ず `Keisuke69 <egoist@epique.net>`** にする。隔離環境（Claude Code on the web 等）の git 既定は `Claude <noreply@anthropic.com>` のため、そのままコミットしないこと。各セッション開始時に `.claude/settings.json` の `SessionStart` フックが `git config user.name` / `user.email` を自動設定してこれを担保する（フックが効かない環境では手動で `git config` してからコミットする）。
- **後片付け**（PR 作成でセッションが終わる場合、マージ検知は同一セッション内では行えない前提）:
  - **リモートの作業ブランチ**: GitHub の「Automatically delete head branches」を有効化済みのため、マージ時に自動削除される（手動操作不要）。
  - **ローカルの worktree / ブランチ**: 次回このリポジトリで作業を開始した際にマージ済みを検知し、`git worktree remove <path>` / `git branch -d <branch>` で掃除する。

## 環境変数（`.env`）

Prisma と Next の両方が `.env` を自動読込する。DevContainer 利用時は `.devcontainer/post-create.sh` → `scripts/setup-env.mjs` がランダムシークレット付きで自動生成する。手動セットアップ時は `.env.example` をコピーして埋める。

- `DATABASE_URL` — SQLite の場所（例 `file:./dev.db`）
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — Better Auth 用
- `ENCRYPTION_KEY` — API キー暗号化鍵。**失うと保存済み API キーは復号不能**（再登録が必要）
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — 任意。UI でキー未設定時のフォールバック

`.env` と `prisma/dev.db` は `.gitignore` 済み（コミット禁止）。

## アーキテクチャの要点

Next.js (App Router) の単一プロセスでフロント + API を提供。Better Auth（email/password）+ Prisma/SQLite。import エイリアス `@/*` → `src/*`。

### 1. モデル能力レジストリが中核（最重要）

`src/lib/model-registry.ts` が**単一の真実のソース**。各モデルの `supports`（`temperature` / `topP` / `maxTokens` / `thinkingEffort`）を宣言し、これが次の両方を駆動する:

- **UI**: `ModelSelector` / `SettingsPanel` が、そのモデルで有効なコントロールだけを表示
- **送信**: `src/lib/params.ts` の `normalizeParams()` が、`streamText` へ渡す前に**非対応パラメータを除去**

理由: **Claude Opus 4.8 / 4.7 は temperature / top_p / top_k を送ると 400 エラー**になる（sampling 系が撤廃済み）。レジストリで非対応 param を「UI に出さない・API に送らない」ことで、API エラーと検証ノイズを防ぐ。→ **モデル追加 = `MODELS` 配列に 1 エントリ足すだけ**。`supports` の正確さがそのまま API 互換性に直結する。

注意: `effort`（Anthropic 4.x 系）は現状**UI 表示のみで SDK へは未送信**（`params.ts` のコメント参照。将来 `providerOptions` 経由で対応予定）。

### 2. チャットリクエストフロー（`src/app/api/chat/route.ts`）

`POST` で順に: セッション検証（Better Auth）→ 会話の所有者チェック → API キー解決 → 末尾の user メッセージを保存 → 会話の provider/model/systemPrompt/params とタイトルを更新 → `buildLanguageModel` でユーザーのキーから**都度プロバイダーを生成** → `streamText`（`normalizeParams` 適用）→ `toUIMessageStreamResponse()` でストリーミング → `onFinish` で assistant メッセージ + usage を保存。会話タイトルは最初の user メッセージ先頭 40 文字から自動生成。

### 3. API キー管理（ユーザー単位 + at rest 暗号化）

- `src/lib/crypto.ts`: AES-256-GCM。`ENCRYPTION_KEY` を SHA-256 で 32 バイト鍵に導出。保存形式は `base64(iv[12] | authTag[16] | ciphertext)`。
- `src/lib/keys.ts` `resolveApiKey()`: 解決順は **ユーザー保存キー（復号）→ env フォールバック → null**。復号失敗時もフォールバックに落ちる。
- `src/lib/provider.ts` `buildLanguageModel()`: グローバルな SDK クライアントは持たず、**リクエストごとにユーザーのキーで** `createOpenAI` / `createAnthropic` を生成する。
- **生キーはクライアントへ返さない**。設定画面には status + 下4桁マスクのみ返す（`getKeyStatuses`）。復号はサーバ側 Route Handler 内でのみ行う。

### 4. データモデル（`prisma/schema.prisma`）

Better Auth 標準テーブル（User / Session / Account / Verification）+ アプリ用（Conversation / Message / ProviderKey）。**SQLite は Json 型非対応のため、`Conversation.params` と `Message.usage` は JSON 文字列として保存**（読み書きで `JSON.parse` / `JSON.stringify`）。会話ごとに provider / model / systemPrompt / params を保存し、「どの設定で何を試したか」を後から再現できる（検証用途の肝）。`ProviderKey` は `(userId, provider)` でユニーク。

### 5. Prisma クライアント（`src/lib/db.ts`）

dev のホットリロードで `PrismaClient` が増殖しないよう `globalThis` に保持する標準パターン。新規にインスタンス化せず、必ずこの `prisma` を import すること。

## 注意点

`docs/DESIGN.md` / `docs/ADR.md` は設計時の記述で、一部が実ファイルとずれている（例: `models.ts` → 実際は `model-registry.ts`、`ChatPane/MessageList/MessageInput` → 実際は単一の `ChatApp.tsx`、`.env.local` → 実際は `.env`）。**実装は `src/` を正とすること**。docs は設計意図・トレードオフの理解に使う。
