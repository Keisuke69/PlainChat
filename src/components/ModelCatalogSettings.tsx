"use client";

import { useEffect, useState } from "react";
import {
  PROVIDER_LABELS,
  mergeModels,
  type ModelEntry,
  type ProviderId,
} from "@/lib/model-registry";
import {
  loadDiscoveredModels,
  saveDiscoveredModels,
  subscribeDiscoveredModels,
} from "@/lib/model-store";

interface ProviderResult {
  provider: ProviderId;
  status: "ok" | "skipped" | "error";
  count: number;
  message?: string;
}

interface CatalogResponse {
  models: ModelEntry[];
  providers: ProviderResult[];
}

// 設定画面のモデル一覧セクション。「更新」ボタンで各社 API から最新モデルを取得し、
// localStorage に保存してチャット画面のプルダウンへ反映する。
export function ModelCatalogSettings() {
  const [discovered, setDiscovered] = useState<ModelEntry[]>([]);
  const [results, setResults] = useState<ProviderResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setDiscovered(loadDiscoveredModels());
    sync();
    return subscribeDiscoveredModels(sync);
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const res = await fetch("/api/models", { method: "POST" });
      if (!res.ok) {
        throw new Error(`取得に失敗しました (${res.status})`);
      }
      const data = (await res.json()) as CatalogResponse;
      saveDiscoveredModels(data.models);
      setResults(data.providers);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // 表示用にマージ済み（静的 + 取得）のモデルをプロバイダーごとに並べる。
  const merged = mergeModels(discovered);
  const byProvider = (p: ProviderId) => merged.filter((m) => m.provider === p);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-medium">利用可能なモデル一覧</h2>
          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "更新中…" : "利用可能なモデル一覧を更新する"}
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-500">
          各プロバイダーの API から、チャットで使える最新モデルを取得してプルダウンに反映します。
          取得には登録済みの API キー（または環境変数）を使用します。
        </p>

        {error && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {results && (
          <ul className="mb-3 space-y-1 text-xs">
            {results.map((r) => (
              <li key={r.provider} className="flex items-center gap-2">
                <span className="font-medium">{PROVIDER_LABELS[r.provider]}:</span>
                {r.status === "ok" && (
                  <span className="text-green-600">{r.count} 件を取得</span>
                )}
                {r.status === "skipped" && (
                  <span className="text-amber-600">スキップ（{r.message}）</span>
                )}
                {r.status === "error" && (
                  <span className="text-red-600">エラー（{r.message}）</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-3 border-t border-gray-200 pt-3">
          {(Object.keys(PROVIDER_LABELS) as ProviderId[]).map((provider) => (
            <div key={provider}>
              <p className="mb-1 text-sm font-medium">{PROVIDER_LABELS[provider]}</p>
              <div className="flex flex-wrap gap-1.5">
                {byProvider(provider).map((m) => (
                  <span
                    key={m.id}
                    title={m.id}
                    className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700"
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
