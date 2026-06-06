# PlainChat — 各プロバイダーのAPIで使える、シンプルなチャット

OpenAI / Anthropic などの API モデルを、プロバイダー/モデルを切り替えながら使えるシンプルな日本語チャット。ChatGPT のチャット機能だけを切り出したような軽量ツール。（もともとは API モデルでのプロンプト検証用に作成）

設計の詳細は [`docs/DESIGN.md`](./docs/DESIGN.md)、技術選定の判断記録は [`docs/ADR.md`](./docs/ADR.md) を参照。

## 🚀 非エンジニアの方へ（かんたん起動）

コマンド操作なしで、**ファイルをダブルクリックするだけ**で起動できます。

- **Mac**: `start.command` をダブルクリック
- **Windows**: `start.bat` をダブルクリック

初回は必要なものを自動でセットアップし（数分）、終わると自動的にブラウザが開きます。Node.js が未インストールの場合は案内ページが自動で開きます。手順の詳細・つまずいたときの対処は **[かんたんスタートガイド](./かんたんスタート.md)** を参照してください。

> 起動スクリプトが自動で行うこと: Node.js の確認 → 依存パッケージの導入 → `.env` のシークレット自動生成 → DB 初期化 → 初回ビルド → サーバ起動 → ブラウザを開く。

以下はエンジニア向けの手動セットアップ手順です。

---

## 主な機能

- シンプルな日本語チャット UI（ストリーミング表示）
- プロバイダー / モデルをプルダウンで切替（OpenAI / Anthropic）
- システムプロンプト入力 + パラメータ調整（モデルが対応するものだけ表示）
- ユーザーごとのアカウント認証（Better Auth）と、ユーザー単位のチャット履歴保存
- API キーを画面から設定・記憶（AES-256-GCM で暗号化保存、下4桁のみ表示）
- ローカル実行（SQLite ファイル DB、外部サービス不要）

## 技術スタック

- Next.js (App Router) + TypeScript / React + Tailwind CSS
- Vercel AI SDK（`ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`）※本番プロダクトと同一 SDK
- Better Auth（email & password）
- Prisma + SQLite

## セットアップ

```bash
cd PlainChat
npm install

# 環境変数を用意（Prisma も Next も .env を読み込みます）
cp .env.example .env
# .env を編集し、BETTER_AUTH_SECRET と ENCRYPTION_KEY をランダムな長い文字列に変更
#   例: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# DB を作成（マイグレーション）
npx prisma migrate dev --name init

# （任意）初期ユーザーを作成。作らない場合はログイン画面から新規登録でも可
npx prisma db seed   # demo@example.com / password123
```

## 起動

```bash
npm run dev
# http://localhost:3000 を開く
```

1. ログイン（または新規登録）
2. 画面右上「設定」から OpenAI / Anthropic の API キーを登録
3. モデルを選び、必要ならシステムプロンプト・パラメータを設定してチャット開始

## モデルごとのパラメータ差異について

本ツールは「API の実挙動の検証」を目的とするため、モデルが対応しないパラメータは UI に表示せず、API にも送りません。例えば **Claude Opus 4.8 / 4.7 は temperature / top_p を送ると 400 エラー**になるため、これらのモデルでは temperature 等のコントロールが非表示になります。制御は `src/lib/model-registry.ts`（モデル能力レジストリ）に集約しています。

## 便利コマンド

```bash
npm run db:studio   # Prisma Studio で履歴データを GUI 閲覧
npm run build       # 本番ビルド（prisma generate + next build）
npm run start       # 本番起動
```

## スコープ外（初期リリース）

画像/ファイル添付、tool use、OAuth ログイン、ロール権限、クラウドデプロイ前提の構成などは含みません（拡張余地）。

## 補足

- `effort`（Anthropic 4.x 系）は現状 UI 表示のみで API へは未送信です（将来 `providerOptions` 経由で対応予定）。
- API キーは `ENCRYPTION_KEY` で暗号化保存されます。鍵を失うと保存済みキーは復号できず、再登録が必要です。
