import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getModelEntry,
  isTransportId,
  type ChatParams,
  type ProviderId,
  type TransportId,
} from "@/lib/model-registry";
import { normalizeParams } from "@/lib/params";
import { buildLanguageModel } from "@/lib/provider";
import { streamDirect } from "@/lib/direct";
import { resolveApiKey } from "@/lib/keys";

export const runtime = "nodejs";

interface ChatBody {
  messages: UIMessage[];
  conversationId: string;
  provider: ProviderId;
  model: string;
  transport?: TransportId;
  systemPrompt?: string;
  params?: ChatParams;
}

function extractText(message: UIMessage | undefined): string {
  if (!message) return "";
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }
  const userId = session.user.id;

  const body = (await req.json()) as ChatBody;
  const { messages, conversationId, provider, model, systemPrompt, params } = body;
  const transport: TransportId = isTransportId(body.transport) ? body.transport : "sdk";

  const entry = getModelEntry(provider, model);
  if (!entry) {
    return Response.json({ error: "未知のモデルです" }, { status: 400 });
  }

  // 会話の所有者チェック
  const convo = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!convo) {
    return Response.json({ error: "会話が見つかりません" }, { status: 404 });
  }

  // API キー解決
  const apiKey = await resolveApiKey(userId, provider);
  if (!apiKey) {
    return Response.json(
      { error: `${provider} の API キーが未設定です。設定画面から登録してください。` },
      { status: 400 },
    );
  }

  // 新しいユーザーメッセージ（末尾の user）を保存
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const userText = extractText(lastUser);
  if (userText) {
    await prisma.message.create({
      data: { conversationId, role: "user", content: userText, model },
    });
  }

  // 会話の設定とタイトルを更新
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      provider,
      model,
      transport,
      systemPrompt: systemPrompt ?? "",
      params: JSON.stringify(params ?? {}),
      title:
        convo.title === "新しいチャット" && userText
          ? userText.slice(0, 40)
          : convo.title,
    },
  });

  // assistant メッセージ + usage の保存（両経路で共有）。
  const persistAssistant = async (text: string, usage: unknown) => {
    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: text,
        model,
        usage: JSON.stringify(usage ?? {}),
      },
    });
  };

  // 直接経路: 各社の公式 SDK で API を直接呼ぶ（Vercel AI SDK は介さない）。
  if (transport === "direct") {
    return streamDirect({
      entry,
      apiKey,
      systemPrompt,
      messages,
      params,
      onFinish: ({ text, usage }) => persistAssistant(text, usage),
    });
  }

  // SDK 経路（既定）: Vercel AI SDK の streamText を使う。
  const languageModel = buildLanguageModel(provider, model, apiKey);

  const result = streamText({
    model: languageModel,
    system: systemPrompt && systemPrompt.length > 0 ? systemPrompt : undefined,
    messages: convertToModelMessages(messages),
    ...normalizeParams(entry, params),
    onFinish: async ({ text, usage }) => {
      await persistAssistant(text, usage);
    },
  });

  return result.toUIMessageStreamResponse();
}
