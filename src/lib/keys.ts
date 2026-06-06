import { and, eq } from "drizzle-orm";
import { db } from "./db";
import { providerKey } from "./schema";
import { decrypt } from "./crypto";
import type { ProviderId } from "./model-registry";

const ENV_FALLBACK: Record<ProviderId, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
};

// キー解決順: ユーザーの保存キー（復号）→ env フォールバック → null
export async function resolveApiKey(
  userId: string,
  provider: ProviderId,
): Promise<string | null> {
  const row = await db.query.providerKey.findFirst({
    where: and(eq(providerKey.userId, userId), eq(providerKey.provider, provider)),
  });
  if (row) {
    try {
      return decrypt(row.encryptedKey);
    } catch {
      // 復号失敗（ENCRYPTION_KEY 変更など）は未設定扱いにしてフォールバックへ
    }
  }
  return ENV_FALLBACK[provider] ?? null;
}

export interface ProviderKeyStatus {
  provider: ProviderId;
  configured: boolean;
  last4: string | null;
  source: "user" | "env" | "none";
}

// 設定画面表示用のステータス（生キーは返さない）
export async function getKeyStatuses(userId: string): Promise<ProviderKeyStatus[]> {
  const providers: ProviderId[] = ["openai", "anthropic"];
  const rows = await db.query.providerKey.findMany({
    where: eq(providerKey.userId, userId),
  });
  return providers.map((provider) => {
    const row = rows.find((r) => r.provider === provider);
    if (row) {
      return { provider, configured: true, last4: row.last4, source: "user" as const };
    }
    if (ENV_FALLBACK[provider]) {
      return { provider, configured: true, last4: null, source: "env" as const };
    }
    return { provider, configured: false, last4: null, source: "none" as const };
  });
}
