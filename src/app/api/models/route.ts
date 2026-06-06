import { auth } from "@/lib/auth";
import { resolveApiKey } from "@/lib/keys";
import { fetchCatalog } from "@/lib/model-catalog";
import { PROVIDERS } from "@/lib/model-registry";

export const runtime = "nodejs";

// 各プロバイダーの API から「現在チャットで使えるモデル一覧」を取得して返す。
// 設定画面の「利用可能なモデル一覧を更新する」ボタンから呼ばれる。
// 取得にはユーザーのキー（resolveApiKey: 保存キー → env フォールバック）を使う。
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const userId = session.user.id;

  const result = await fetchCatalog(
    (provider) => resolveApiKey(userId, provider),
    PROVIDERS,
  );

  return Response.json(result);
}
