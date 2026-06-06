// モデル能力レジストリ（クライアント/サーバ両用の純データ）。
// 各モデルが「どのコントロールを表示し、どのパラメータを送ってよいか」を宣言する。
// ここを単一の真実のソースとして UI 表示と送信パラメータ正規化を駆動する。

export type ProviderId = "openai" | "anthropic";

// API リクエストの実行方法（トランスポート）。
// - sdk:    Vercel AI SDK（streamText）経由。本番プロダクトと同じ経路（既定）。
// - direct: 各社の公式 SDK（openai / @anthropic-ai/sdk）で API を直接呼ぶ経路。
//           SDK の抽象化を挟まず、API の素の挙動をより忠実に検証したいとき用。
export type TransportId = "sdk" | "direct";

export const TRANSPORTS: TransportId[] = ["sdk", "direct"];

export const TRANSPORT_LABELS: Record<TransportId, string> = {
  sdk: "Vercel AI SDK",
  direct: "プロバイダー公式SDK（直接）",
};

// UI のヘルプ表示用の補足説明。
export const TRANSPORT_DESCRIPTIONS: Record<TransportId, string> = {
  sdk: "本番プロダクトと同じ Vercel AI SDK 経由。",
  direct: "openai / @anthropic-ai/sdk で各社 API を直接呼び出す。",
};

export const DEFAULT_TRANSPORT: TransportId = "sdk";

export function isTransportId(value: unknown): value is TransportId {
  return value === "sdk" || value === "direct";
}

export interface ModelEntry {
  provider: ProviderId;
  id: string;
  label: string;
  supports: {
    temperature: boolean;
    topP: boolean;
    maxTokens: boolean;
    /** Anthropic 4.x 系の effort 切替を UI に出すか（送信は将来対応） */
    thinkingEffort: boolean;
  };
  defaults: {
    maxTokens: number;
    temperature?: number;
    topP?: number;
  };
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
};

export const MODELS: ModelEntry[] = [
  // ----- OpenAI -----
  {
    provider: "openai",
    id: "gpt-4o",
    label: "GPT-4o",
    supports: { temperature: true, topP: true, maxTokens: true, thinkingEffort: false },
    defaults: { maxTokens: 2048, temperature: 1, topP: 1 },
  },
  {
    provider: "openai",
    id: "gpt-4.1",
    label: "GPT-4.1",
    supports: { temperature: true, topP: true, maxTokens: true, thinkingEffort: false },
    defaults: { maxTokens: 2048, temperature: 1, topP: 1 },
  },
  // ----- Anthropic -----
  // Opus 4.8 / 4.7 は temperature / top_p / top_k を送ると 400。sampling 系は非表示・未送信にする。
  {
    provider: "anthropic",
    id: "claude-opus-4-8",
    label: "Claude Opus 4.8",
    supports: { temperature: false, topP: false, maxTokens: true, thinkingEffort: true },
    defaults: { maxTokens: 2048 },
  },
  {
    provider: "anthropic",
    id: "claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    supports: { temperature: true, topP: true, maxTokens: true, thinkingEffort: true },
    defaults: { maxTokens: 2048, temperature: 1 },
  },
  {
    provider: "anthropic",
    id: "claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    supports: { temperature: true, topP: true, maxTokens: true, thinkingEffort: false },
    defaults: { maxTokens: 2048, temperature: 1 },
  },
];

export function getModelEntry(provider: string, id: string): ModelEntry | undefined {
  return MODELS.find((m) => m.provider === provider && m.id === id);
}

export function listModelsByProvider(provider: ProviderId): ModelEntry[] {
  return MODELS.filter((m) => m.provider === provider);
}

// ----- 動的に取得したモデルの能力推定 -----
// 設定画面の「利用可能なモデル一覧を更新する」で各社 API から取得したモデルは、
// 静的レジストリ（MODELS）に無いため supports が不明。ここで id から能力を推定する。
// クライアント（UI 表示）とサーバ（送信パラメータ正規化・chat route）が同じ関数を使うことで、
// 「UI に出すコントロール」と「実際に送るパラメータ」を必ず一致させる。
// 既知モデルは MODELS の精密な定義が常に優先される（resolveModelEntry 参照）。

function inferSupports(provider: ProviderId, id: string): ModelEntry["supports"] {
  if (provider === "anthropic") {
    // Opus 4.8 / 4.7 は sampling 系（temperature / top_p）を撤廃済み → 送ると 400。
    const noSampling = /opus-4-[78]/.test(id);
    // Claude 4.x 系（opus / sonnet）は thinking effort を持つ。
    const hasEffort = /(opus|sonnet)-4-\d/.test(id);
    return {
      temperature: !noSampling,
      topP: !noSampling,
      maxTokens: true,
      thinkingEffort: hasEffort,
    };
  }
  // OpenAI: o 系・gpt-5 系などの推論モデルは temperature / top_p を受け付けない。
  const isReasoning = /^o\d/.test(id) || /^gpt-5/.test(id);
  return {
    temperature: !isReasoning,
    topP: !isReasoning,
    maxTokens: true,
    thinkingEffort: false,
  };
}

// id とラベルから ModelEntry を構築（取得モデル用）。supports は推定値。
export function buildModelEntry(
  provider: ProviderId,
  id: string,
  label?: string,
): ModelEntry {
  const supports = inferSupports(provider, id);
  return {
    provider,
    id,
    label: label && label.length > 0 ? label : id,
    supports,
    defaults: {
      maxTokens: 2048,
      ...(supports.temperature ? { temperature: 1 } : {}),
    },
  };
}

// モデル定義の解決: 静的レジストリ優先、無ければ id から推定したエントリを返す。
// chat route はこれで動的取得モデルも扱える（未知 = 即 400 にしない）。
export function resolveModelEntry(provider: string, id: string): ModelEntry {
  const known = getModelEntry(provider, id);
  if (known) return known;
  return buildModelEntry(provider as ProviderId, id);
}

// 静的レジストリと取得済みモデルをマージ（UI のプルダウン用）。
// 同一 (provider, id) は静的レジストリの精密な定義を優先する。
export function mergeModels(discovered: ModelEntry[]): ModelEntry[] {
  const byKey = new Map<string, ModelEntry>();
  for (const m of discovered) byKey.set(`${m.provider}:${m.id}`, m);
  for (const m of MODELS) byKey.set(`${m.provider}:${m.id}`, m);
  return [...byKey.values()];
}

export const PROVIDERS: ProviderId[] = ["openai", "anthropic"];

export interface ChatParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}
