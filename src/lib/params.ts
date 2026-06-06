import type { ChatParams, ModelEntry } from "./model-registry";

// レジストリに基づき、AI SDK の streamText へ渡すパラメータを正規化する。
// 非対応パラメータは除去（例: Opus 4.8/4.7 へ temperature を送らない）。
export interface NormalizedParams {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export function normalizeParams(entry: ModelEntry, raw: ChatParams | undefined): NormalizedParams {
  const out: NormalizedParams = {};
  const p = raw ?? {};
  if (entry.supports.temperature && typeof p.temperature === "number") {
    out.temperature = p.temperature;
  }
  if (entry.supports.topP && typeof p.topP === "number") {
    out.topP = p.topP;
  }
  if (entry.supports.maxTokens && typeof p.maxTokens === "number") {
    out.maxOutputTokens = p.maxTokens;
  }
  // effort は UI 表示のみ（現状 AI SDK へは未送信）。将来 providerOptions 経由で対応予定。
  return out;
}
