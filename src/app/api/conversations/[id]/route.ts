import { and, asc, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { conversation, message } from "@/lib/schema";

// 1 会話の詳細 + メッセージ
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const convo = await db.query.conversation.findFirst({
    where: and(eq(conversation.id, id), eq(conversation.userId, session.user.id)),
  });
  if (!convo) return new Response("Not found", { status: 404 });

  const messages = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, id))
    .orderBy(asc(message.createdAt));

  return Response.json({ conversation: { ...convo, messages } });
}

// 会話削除
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const deleted = await db
    .delete(conversation)
    .where(and(eq(conversation.id, id), eq(conversation.userId, session.user.id)))
    .returning({ id: conversation.id });
  if (deleted.length === 0) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
