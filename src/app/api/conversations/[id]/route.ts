import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 1 会話の詳細 + メッセージ
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const conversation = await prisma.conversation.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return new Response("Not found", { status: 404 });

  return Response.json({ conversation });
}

// 会話削除
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  const result = await prisma.conversation.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) return new Response("Not found", { status: 404 });

  return Response.json({ ok: true });
}
