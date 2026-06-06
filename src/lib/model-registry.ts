// モデル能力レジストリ（クライアント/サーバ両用の純データ）。
// 各モデルが「どのコントロールを表示し、どのパラメータを送ってよいか」を宣言する。
// ここを単一の真実のソースとして UI 表示と送信パラメータ正規化を駆動する。

export type ProviderId = "openai" | "anthropic";

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

export const PROVIDERS: ProviderId[] = ["openai", "anthropic"];

export interface ChatParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
}
