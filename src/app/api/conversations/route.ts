import { desc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversation } from "@/lib/schema";

// 会話一覧
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const conversations = await db
    .select({
      id: conversation.id,
      title: conversation.title,
      provider: conversation.provider,
      model: conversation.model,
      updatedAt: conversation.updatedAt,
    })
    .from(conversation)
    .where(eq(conversation.userId, session.user.id))
    .orderBy(desc(conversation.updatedAt));
  return Response.json({ conversations });
}

// 会話作成
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as {
    provider: string;
    model: string;
    transport?: string;
    systemPrompt?: string;
    params?: unknown;
  };

  const [created] = await db
    .insert(conversation)
    .values({
      userId: session.user.id,
      provider: body.provider,
      model: body.model,
      transport: body.transport === "direct" ? "direct" : "sdk",
      systemPrompt: body.systemPrompt ?? "",
      params: JSON.stringify(body.params ?? {}),
    })
    .returning({
      id: conversation.id,
      title: conversation.title,
      provider: conversation.provider,
      model: conversation.model,
      updatedAt: conversation.updatedAt,
    });
  return Response.json({ conversation: created });
}
