import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { randomUUID } from "node:crypto";
import type { ModelEntry, ChatParams } from "./model-registry";
import { resolveParams } from "./params";

// 「直接」経路: Vercel AI SDK を介さず、各社の公式 SDK（openai / @anthropic-ai/sdk）で
// API を直接呼び出す。出力は AI SDK の UI message stream プロトコルへ橋渡しするため、
// クライアント側（useChat + DefaultChatTransport）は SDK 経路と同じまま変更不要。
//
// 送信パラメータは SDK 経路と同様に model-registry の supports で正規化する
// （例: Opus 4.8/4.7 へ temperature / top_p を送らない）。

export interface StreamDirectOptions {
  entry: ModelEntry;
  apiKey: string;
  systemPrompt?: string;
  messages: UIMessage[];
  params?: ChatParams;
  // ストリーム完了時に assistant メッセージ + usage を保存するためのコールバック。
  // SDK 経路の streamText({ onFinish }) と同じ責務（DB 書き込みは呼び出し側に委ねる）。
  onFinish: (result: { text: string; usage: unknown }) => Promise<void> | void;
}

interface SimpleMessage {
  role: "user" | "assistant";
  content: string;
}

function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

// UIMessage[]（履歴）を各社 API 共通の単純な {role, content} 配列へ変換する。
// 本ツールはテキストのみ対応（画像/ツール等はスコープ外）なので text パートのみ抽出する。
function toSimpleMessages(messages: UIMessage[]): SimpleMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: textOf(m) }));
}

// 各プロバイダーのストリームを「テキスト差分」と「usage」の中立チャンク列へ正規化する。
type DirectChunk =
  | { type: "text"; text: string }
  | { type: "usage"; usage: unknown };

async function* openaiStream(opts: StreamDirectOptions): AsyncGenerator<DirectChunk> {
  const { entry, apiKey, systemPrompt, messages, params } = opts;
  const client = new OpenAI({ apiKey });
  const r = resolveParams(entry, params);

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (systemPrompt && systemPrompt.length > 0) {
    chatMessages.push({ role: "system", content: systemPrompt });
  }
  for (const m of toSimpleMessages(messages)) {
    chatMessages.push(
      m.role === "user"
        ? { role: "user", content: m.content }
        : { role: "assistant", content: m.content },
    );
  }

  const body: OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming = {
    model: entry.id,
    messages: chatMessages,
    stream: true,
    stream_options: { include_usage: true },
    ...(r.temperature !== undefined ? { temperature: r.temperature } : {}),
    ...(r.topP !== undefined ? { top_p: r.topP } : {}),
    ...(r.maxTokens !== undefined ? { max_tokens: r.maxTokens } : {}),
    ...(r.seed !== undefined ? { seed: r.seed } : {}),
  };

  const stream = await client.chat.completions.create(body);
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield { type: "text", text: delta };
    // include_usage 指定時、最終チャンクに usage が乗る（choices は空）。
    if (chunk.usage) yield { type: "usage", usage: chunk.usage };
  }
}

async function* anthropicStream(opts: StreamDirectOptions): AsyncGenerator<DirectChunk> {
  const { entry, apiKey, systemPrompt, messages, params } = opts;
  const client = new Anthropic({ apiKey });
  const r = resolveParams(entry, params);
  // Anthropic は max_tokens 必須。未指定時はモデル既定へフォールバック。
  const maxTokens = r.maxTokens ?? entry.defaults.maxTokens ?? 1024;

  const body: Anthropic.Messages.MessageCreateParamsStreaming = {
    model: entry.id,
    max_tokens: maxTokens,
    messages: toSimpleMessages(messages),
    stream: true,
    ...(systemPrompt && systemPrompt.length > 0 ? { system: systemPrompt } : {}),
    ...(r.temperature !== undefined ? { temperature: r.temperature } : {}),
    ...(r.topP !== undefined ? { top_p: r.topP } : {}),
    ...(r.topK !== undefined ? { top_k: r.topK } : {}),
  };

  const stream = await client.messages.create(body);
  let inputTokens: number | null = null;
  let outputTokens = 0;
  for await (const event of stream) {
    if (event.type === "message_start") {
      inputTokens = event.message.usage.input_tokens;
    } else if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      yield { type: "text", text: event.delta.text };
    } else if (event.type === "message_delta") {
      outputTokens = event.usage.output_tokens ?? outputTokens;
    }
  }
  yield { type: "usage", usage: { input_tokens: inputTokens, output_tokens: outputTokens } };
}

export function streamDirect(opts: StreamDirectOptions): Response {
  const provider = opts.entry.provider;
  const id = randomUUID();

  const stream = createUIMessageStream<UIMessage>({
    execute: async ({ writer }) => {
      // UI message stream の標準フレーミング（ライブラリの text ストリーム整形と同じ並び）。
      writer.write({ type: "start" });
      writer.write({ type: "start-step" });
      writer.write({ type: "text-start", id });

      const source =
        provider === "openai" ? openaiStream(opts) : anthropicStream(opts);

      let full = "";
      let usage: unknown = undefined;
      for await (const chunk of source) {
        if (chunk.type === "text") {
          full += chunk.text;
          writer.write({ type: "text-delta", id, delta: chunk.text });
        } else {
          usage = chunk.usage;
        }
      }

      writer.write({ type: "text-end", id });
      writer.write({ type: "finish-step" });
      writer.write({ type: "finish" });

      // SDK 経路と同様に、ストリーム終了後へ assistant メッセージ + usage を保存。
      await opts.onFinish({ text: full, usage });
    },
    // 例外（認証エラー・400 など）は error チャンクとしてクライアントへ伝える。
    onError: (error) => (error instanceof Error ? error.message : String(error)),
  });

  return createUIMessageStreamResponse({ stream });
}
