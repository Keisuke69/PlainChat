import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// 会話一覧
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, provider: true, model: true, updatedAt: true },
  });
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

  const conversation = await prisma.conversation.create({
    data: {
      userId: session.user.id,
      provider: body.provider,
      model: body.model,
      transport: body.transport === "direct" ? "direct" : "sdk",
      systemPrompt: body.systemPrompt ?? "",
      params: JSON.stringify(body.params ?? {}),
    },
    select: { id: true, title: true, provider: true, model: true, updatedAt: true },
  });
  return Response.json({ conversation });
}
