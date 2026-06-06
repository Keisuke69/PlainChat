import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { ProviderId } from "./model-registry";

// ユーザーごとの API キーで都度プロバイダーを生成し、AI SDK の言語モデルを返す。
export function buildLanguageModel(
  provider: ProviderId,
  modelId: string,
  apiKey: string,
): LanguageModel {
  if (provider === "openai") {
    return createOpenAI({ apiKey })(modelId);
  }
  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(modelId);
  }
  throw new Error(`未知のプロバイダー: ${provider}`);
}
