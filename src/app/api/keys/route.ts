import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, last4 } from "@/lib/crypto";
import { getKeyStatuses } from "@/lib/keys";
import type { ProviderId } from "@/lib/model-registry";

const VALID_PROVIDERS: ProviderId[] = ["openai", "anthropic"];

function isProvider(v: unknown): v is ProviderId {
  return typeof v === "string" && (VALID_PROVIDERS as string[]).includes(v);
}

// 各プロバイダーのキー設定状態（設定有無 + 下4桁マスク）。生キーは返さない。
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const statuses = await getKeyStatuses(session.user.id);
  return Response.json({ statuses });
}

// キーの保存（暗号化して upsert）
export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { provider?: unknown; apiKey?: unknown };
  if (!isProvider(body.provider) || typeof body.apiKey !== "string" || body.apiKey.length < 8) {
    return Response.json({ error: "プロバイダーまたは API キーが不正です" }, { status: 400 });
  }

  const provider = body.provider;
  const apiKey = body.apiKey.trim();

  await prisma.providerKey.upsert({
    where: { userId_provider: { userId: session.user.id, provider } },
    create: {
      userId: session.user.id,
      provider,
      encryptedKey: encrypt(apiKey),
      last4: last4(apiKey),
    },
    update: {
      encryptedKey: encrypt(apiKey),
      last4: last4(apiKey),
    },
  });

  return Response.json({ ok: true, provider, last4: last4(apiKey) });
}

// キーの削除
export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json()) as { provider?: unknown };
  if (!isProvider(body.provider)) {
    return Response.json({ error: "プロバイダーが不正です" }, { status: 400 });
  }

  await prisma.providerKey.deleteMany({
    where: { userId: session.user.id, provider: body.provider },
  });
  return Response.json({ ok: true });
}
