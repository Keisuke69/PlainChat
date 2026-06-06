// 各プロバイダーの API から「現在利用可能なモデル一覧」を取得する（サーバ専用）。
// 設定画面の「利用可能なモデル一覧を更新する」から呼ばれる。
// チャットで使えるモデルだけに絞り込み、model-registry の buildModelEntry で
// ModelEntry（supports 推定込み）へ写像する。生の API キーはここから外へ出さない。

import { buildModelEntry, type ModelEntry, type ProviderId } from "./model-registry";

export interface CatalogResult {
  // 取得できたモデル（プロバイダー横断）。
  models: ModelEntry[];
  // プロバイダー単位の取得結果（UI のフィードバック用）。
  providers: ProviderResult[];
}

export interface ProviderResult {
  provider: ProviderId;
  // ok: 取得成功 / skipped: キー未設定でスキップ / error: 取得失敗
  status: "ok" | "skipped" | "error";
  count: number;
  message?: string;
}

// --- OpenAI: GET /v1/models はチャット以外（埋め込み・音声・画像等）も返すため絞り込む ---
// チャット補完で使えない、または非対話のモデル id を除外するキーワード。
const OPENAI_EXCLUDE =
  /(instruct|embedding|embed|moderation|whisper|tts|audio|realtime|transcribe|image|dall-e|davinci|babbage|search|computer-use|codex)/;
// チャット補完で使えるモデル id の接頭辞。
const OPENAI_INCLUDE = /^(gpt-|o\d|chatgpt-)/;

function isOpenAIChatModel(id: string): boolean {
  return OPENAI_INCLUDE.test(id) && !OPENAI_EXCLUDE.test(id);
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`OpenAI モデル一覧の取得に失敗しました (${res.status})`);
  }
  const data = (await res.json()) as { data?: { id: string }[] };
  const ids = (data.data ?? [])
    .map((m) => m.id)
    .filter(isOpenAIChatModel)
    .sort();
  return ids.map((id) => buildModelEntry("openai", id));
}

// --- Anthropic: GET /v1/models は Claude（=すべてチャット）を返す。display_name をラベルに使う ---
async function fetchAnthropicModels(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) {
    throw new Error(`Anthropic モデル一覧の取得に失敗しました (${res.status})`);
  }
  const data = (await res.json()) as {
    data?: { id: string; display_name?: string }[];
  };
  return (data.data ?? [])
    .filter((m) => m.id.startsWith("claude-"))
    .map((m) => buildModelEntry("anthropic", m.id, m.display_name));
}

const FETCHERS: Record<ProviderId, (apiKey: string) => Promise<ModelEntry[]>> = {
  openai: fetchOpenAIModels,
  anthropic: fetchAnthropicModels,
};

// プロバイダーごとにキーを解決して取得。キーが無ければ skipped、失敗は error として返す
// （1 プロバイダーの失敗で全体を落とさない）。
export async function fetchCatalog(
  resolveKey: (provider: ProviderId) => Promise<string | null>,
  providers: ProviderId[],
): Promise<CatalogResult> {
  const models: ModelEntry[] = [];
  const results: ProviderResult[] = [];

  for (const provider of providers) {
    const apiKey = await resolveKey(provider);
    if (!apiKey) {
      results.push({ provider, status: "skipped", count: 0, message: "API キー未設定" });
      continue;
    }
    try {
      const fetched = await FETCHERS[provider](apiKey);
      models.push(...fetched);
      results.push({ provider, status: "ok", count: fetched.length });
    } catch (e) {
      results.push({
        provider,
        status: "error",
        count: 0,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { models, providers: results };
}
