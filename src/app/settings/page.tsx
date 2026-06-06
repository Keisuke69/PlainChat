import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { ApiKeySettings } from "@/components/ApiKeySettings";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">設定 — API キー</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← チャットに戻る
        </Link>
      </div>
      <p className="mb-6 text-sm text-gray-500">
        各プロバイダーの API キーを登録します。キーは暗号化して保存され、画面には下 4 桁のみ表示されます。
      </p>
      <ApiKeySettings />
    </div>
  );
}
