# ADR: 主要な技術選定の判断記録

このファイルは `PlainChat` の主要な意思決定を Architecture Decision Record 形式で記録する。

---

## ADR-001: LLM アクセスに Vercel AI SDK を採用

- **背景**: 本ツールの目的は「本番プロダクトで使うプロンプトを、本番と同じ条件で検証する」こと。本番プロダクトは Vercel AI SDK を採用している。
- **決定**: 検証ツールも **Vercel AI SDK（`ai` + `@ai-sdk/openai` + `@ai-sdk/anthropic`）** を採用する。
- **理由**: 同じ SDK を使うことで、パラメータの扱いやプロバイダー差異の吸収のされ方が本番と一致し、検証結果の信頼性が上がる。プロバイダー切替が容易（モデルファクトリを差し替えるだけ）で、Gemini 等の追加も `@ai-sdk/google` を足すだけ。
- **代替案**: 各社公式 SDK（`openai` / `@anthropic-ai/sdk`）直結。API 挙動を最も生に再現できるが、**本番（Vercel AI SDK）と挙動がずれる可能性**があり、検証ツールとしては不利。
- **トレードオフ**: SDK の抽象化レイヤーの癖をそのまま受け入れる。ただしそれは本番でも同じなので検証目的では許容。

---

## ADR-002: 認証に Better Auth を採用

- **背景**: 「最低限の認証」かつ「ユーザーごとのアカウント・履歴分離」が要件。利用者は非エンジニア。
- **決定**: **Better Auth（email & password）** を採用。
- **理由**: TypeScript ネイティブで、メール/パスワード認証・パスワードハッシュ・セッション管理を標準提供。Prisma（SQLite）アダプタで連携でき、自前実装を最小化できる。
- **代替案**:
  - Auth.js (NextAuth v5) Credentials Provider — Next.js 定番だが、Credentials のパスワード検証・ユーザー管理を自前で書く必要があり手数が多い。
  - HTTP Basic 認証 / 共有パスワード — ユーザーごとの履歴分離ができないため不採用。
- **トレードオフ**: Better Auth は比較的新しい。スキーマは CLI で生成し、バージョン更新時は schema 同期に注意。

---

## ADR-003: 永続化に SQLite + Prisma を採用

- **背景**: 「ローカル実行」「履歴保存」が要件。外部 DB サーバは避けたい。
- **決定**: **SQLite（単一ファイル）+ Prisma ORM**。
- **理由**: 外部サービス不要、バックアップはファイルコピーのみ。Prisma は型安全・マイグレーション管理が容易で、Prisma Studio で履歴を GUI 閲覧できる（非エンジニアのデータ確認にも有用）。
- **代替案**: Drizzle ORM + better-sqlite3（より軽量・ゼロランタイムバイナリ）。十分妥当だが、マイグレーション体験と Studio を優先して Prisma を採用。
- **トレードオフ**: Prisma の query engine バイナリが必要。ローカル単一マシン用途では問題にならない。

---

## ADR-004: API キーは UI 設定 + AES 暗号化でユーザー単位に保存

- **背景**: 各プロバイダーの API キーを UI から設定し、記憶したい。ユーザーごとアカウントのため、キーもユーザー単位が自然。
- **決定**: `ProviderKey` テーブルにユーザー単位で保存。`ENCRYPTION_KEY`（環境変数）を用いた **AES-256-GCM（`node:crypto`）で at rest 暗号化**。UI には設定状態と下 4 桁マスクのみ返す。
- **理由**: ローカルとはいえ DB ファイルに平文の API キーを置くのは避けたい。生キーをクライアントへ返さないことで漏洩面を減らす。`.env.local` のキーは UI 未設定時のフォールバックに格下げ。
- **代替案**:
  - `.env.local` のみで管理 — UI から設定・記憶という要件を満たせない。
  - 平文 DB 保存 — 実装は楽だが秘密情報の取り扱いとして不適切。
- **トレードオフ**: `ENCRYPTION_KEY` を失うと保存済みキーは復号不能（再入力が必要）。鍵管理の責任が増えるが、ローカル用途では許容。

---

## ADR-005: モデル能力レジストリでパラメータをモデル別に制御

- **背景**: プロバイダー/モデルで使えるパラメータが異なる。特に **Claude Opus 4.8 / 4.7 は temperature / top_p / top_k を送ると 400 エラー**になる（sampling 系撤廃、thinking/effort 体系へ移行）。非エンジニアが触ってエラーになるのは避けたい。
- **決定**: `lib/models.ts` に**モデル能力レジストリ**を置き、各モデルが「どのコントロールを表示し、どのパラメータを送ってよいか」を宣言。UI 表示と送信パラメータ正規化（`lib/params.ts`）の両方をこれで駆動する。
- **理由**: 単一の真実のソースでモデル差異を管理でき、非対応パラメータを UI に出さず・送らないことで API エラーと検証ノイズを防ぐ。新モデル追加はレジストリに 1 行足すだけ。
- **代替案**: 送信時に try/catch でエラーを握りつぶす — 利用者に分かりにくく、検証の忠実性も損なう。
- **トレードオフ**: モデルの仕様変更に追従してレジストリを更新する運用が必要。

---

## ADR-006: API 実行方法（トランスポート）を切替可能にし、直接経路に公式プロバイダー SDK を採用

- **背景**: 本ツールの目的は「API モデルでのプロンプト挙動を忠実に検証する」こと。既定の実行経路は ADR-001 のとおり **Vercel AI SDK** だが、これは抽象化レイヤーであり、メッセージ整形・パラメータ名・プロバイダー差異の吸収など独自の正規化が挟まる。**「SDK を通さない素の API 挙動」も併せて確認したい**、また **本番（Vercel AI SDK）との差分そのものを検証したい**という要件が出た（ユーザー要望: API リクエストの実行方法を選択・設定できるようにする）。
- **決定**: 既定の Vercel AI SDK 経路は**そのまま残し**、切替先として **「直接」経路**を追加する。直接経路は **各社の公式 SDK（`openai` / `@anthropic-ai/sdk`）でアプリ内（in-process）から API を直接呼び出す**。実行方法は `TransportId`（`'sdk'` | `'direct'`、既定 `'sdk'`）として**会話ごとに永続化**する。
- **検討した代替案**:
  - **(a) 生 HTTP（fetch）直叩き** — 変換層ゼロで最も忠実。ただし SSE パース・各社の認証ヘッダ/エンドポイント差異・エラー処理を自前で抱える。保守コストが高い。
  - **(b) 公式プロバイダー SDK（採用）** — `openai` / `@anthropic-ai/sdk`。ネイティブ schema（Anthropic なら `system` + content blocks の `/v1/messages`）をほぼ素通しする薄いラッパーで、in-process・型安全。忠実度は生 HTTP に次ぐ高さ。
  - **(c) LiteLLM** — 不採用。理由を次項に明記。
- **理由（なぜ公式 SDK か）**:
  - **忠実度が十分高い**: 公式 SDK はネイティブ API へほぼ素通し。Vercel AI SDK のような統一抽象を挟まないため、各社の素の挙動・応答形（`stop_reason`、`usage` の内訳等）に近い。
  - **単一プロセス・外部依存ゼロを維持**（ADR-003 と同じ原則）: npm 依存を 2 つ足すだけで in-process 実行でき、ローカル完結。
  - **型安全・保守性**: 生 HTTP（案 a）より SSE パースや差異吸収を SDK に任せられ、TypeScript の型が効く。忠実度との実用的なバランスとして最良。
- **LiteLLM を採らなかった理由**:
  - LiteLLM の本体は **Python 製 SDK と別プロセスの Proxy サーバ**。本リポジトリは TS/Next.js なので、使うなら **Proxy を外部プロセス（Docker 等）で常駐**させて HTTP 接続する形になり、**「単一プロセス・外部サービス不要・ローカル完結」（ADR-003）と衝突**する。
  - LiteLLM は **全リクエストを OpenAI 互換形式に統一**して各社へ翻訳・逆翻訳する。Vercel AI SDK に加えて**もう一段の正規化シム**が挟まり、**忠実度はむしろ下がる**（Anthropic ネイティブの request/response が OpenAI 形に丸められる、`drop_params`/マッピング挙動という新たな変数が増える）。検証ツールの目的に逆行する。
  - LiteLLM が活きるのは「多数プロバイダーを 1 つの統一 IF で」「キー/予算の集中管理・ログ/コスト集計」といった**ゲートウェイ用途**。本ツールの「少数プロバイダー × 忠実検証 × 外部依存ゼロ」とは方向が異なる。
- **永続化の方針**: provider / model / systemPrompt / params と同列に **`Conversation.transport` を会話ごとに保存**。履歴を開くと実行方法も復元され、「どの経路で何を試したか」を再現できる（検証用途の肝）。会話単位の一時切替ではなく永続化を選択した。
- **実装サマリ**:
  - `src/lib/model-registry.ts`: `TransportId` / `TRANSPORTS` / `TRANSPORT_LABELS` / `TRANSPORT_DESCRIPTIONS` / `isTransportId()` を追加（UI 切替と送信経路の単一の真実のソース）。
  - `src/lib/params.ts`: プロバイダー非依存の中立形 `resolveParams()` を切り出し、SDK 経路（`normalizeParams()`）と直接経路の**両方で共有**。→ **Opus 4.8/4.7 へ temperature / top_p を送らない**正規化を直接経路でも担保。
  - `src/lib/direct.ts`（新規）: `streamDirect()` が公式 SDK のストリームを `createUIMessageStream` で **AI SDK の UI message stream プロトコルへ橋渡し**。クライアント（`useChat` + `DefaultChatTransport`）は**無改修**。assistant メッセージ + usage の保存は `/api/chat` 側の共有コールバックで実施。
  - `prisma/schema.prisma` + マイグレーション: `Conversation.transport`（`String @default("sdk")`）を追加。
  - UI: `src/components/TransportSelector.tsx`（ヘッダーの「実行方法」セレクタ）。
- **検証**:
  - `tsc --noEmit` / `npm run build`（全ルートの型検証込み）パス。
  - マイグレーションをクリーンな SQLite に適用 → `transport` 列が `default='sdk'`、新規会話は `sdk`、明示 `direct` も永続化を確認。
  - UI message stream のフレーミングを AI SDK 自身のリーダ（クライアントと同じ機構）で往復検証 → 復元テキスト一致。
  - **公式 SDK の baseURL をローカルのモックプロバイダー（SSE）へ向け、本物の `streamDirect` をエンドツーエンド実行** → OpenAI / Anthropic 両経路で assistant テキスト・usage・`text-delta` の伝搬を確認（PASS）。実プロバイダーへの実呼び出しのみ API キーが必要なため未実施。
- **トレードオフ / 結果**:
  - 依存が 2 つ増える（`openai` / `@anthropic-ai/sdk`）。
  - 直接経路は Vercel AI SDK の `providerOptions`（thinking/effort 等）を共有しない最小実装（テキストストリーミング + 基本 sampling）。`effort` は両経路とも現状未送信のまま。
  - 直接経路の `usage` はプロバイダーネイティブ形（SDK 経路は AI SDK 形）。usage は現状 UI 非表示のため実害なし。
  - 利点として、**Vercel AI SDK 経路と直接経路の差分そのもの**を同一 UI で比較検証できるようになる。
- **関連**: ADR-001（Vercel AI SDK を既定に据える方針は不変。本 ADR はそれを覆さず、検証用の別経路を**追加**するもの）。ADR-003（外部依存ゼロ・ローカル完結の原則が LiteLLM 不採用の主因）。ADR-005（レジストリ駆動のパラメータ制御を直接経路にも適用）。
