import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ApiKeySettings } from "@/components/ApiKeySettings";
import { ModelCatalogSettings } from "@/components/ModelCatalogSettings";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">設定</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← チャットに戻る
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-base font-semibold">API キー</h2>
        <p className="mb-4 text-sm text-gray-500">
          各プロバイダーの API キーを登録します。キーは暗号化して保存され、画面には下 4 桁のみ表示されます。
        </p>
        <ApiKeySettings />
      </section>

      <section>
        <h2 className="mb-2 text-base font-semibold">モデル</h2>
        <p className="mb-4 text-sm text-gray-500">
          標準で選べるモデルに加え、各プロバイダーの最新モデルを取得して選択肢に追加できます。
        </p>
        <ModelCatalogSettings />
      </section>
    </div>
  );
}
