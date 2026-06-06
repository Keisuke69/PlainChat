import type { ChatParams, ModelEntry } from "./model-registry";

// レジストリの supports に基づき、送ってよいパラメータだけを抽出した中立形。
// プロバイダー非依存（SDK 経路・直接経路の両方がここを起点にする）。
// 非対応パラメータは除去（例: Opus 4.8/4.7 へ temperature を送らない）。
export interface ResolvedParams {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
}

export function resolveParams(entry: ModelEntry, raw: ChatParams | undefined): ResolvedParams {
  const out: ResolvedParams = {};
  const p = raw ?? {};
  if (entry.supports.temperature && typeof p.temperature === "number") {
    out.temperature = p.temperature;
  }
  if (entry.supports.topP && typeof p.topP === "number") {
    out.topP = p.topP;
  }
  if (entry.supports.maxTokens && typeof p.maxTokens === "number") {
    out.maxTokens = p.maxTokens;
  }
  // effort は UI 表示のみ（現状どちらの経路でも未送信）。将来 providerOptions 等で対応予定。
  return out;
}

// 中立形を AI SDK の streamText が受け取る形（maxOutputTokens）へ写像する。
export interface NormalizedParams {
  temperature?: number;
  topP?: number;
  maxOutputTokens?: number;
}

export function normalizeParams(entry: ModelEntry, raw: ChatParams | undefined): NormalizedParams {
  const r = resolveParams(entry, raw);
  const out: NormalizedParams = {};
  if (r.temperature !== undefined) out.temperature = r.temperature;
  if (r.topP !== undefined) out.topP = r.topP;
  if (r.maxTokens !== undefined) out.maxOutputTokens = r.maxTokens;
  return out;
}
