"use client";

import { useEffect, useState } from "react";
import { PROVIDER_LABELS, PROVIDERS, type ProviderId } from "@/lib/model-registry";

interface KeyStatus {
  provider: ProviderId;
  configured: boolean;
  last4: string | null;
  source: "user" | "env" | "none";
}

export function ApiKeySettings() {
  const [statuses, setStatuses] = useState<KeyStatus[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/keys");
    if (res.ok) {
      const data = (await res.json()) as { statuses: KeyStatus[] };
      setStatuses(data.statuses);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(provider: ProviderId) {
    const apiKey = inputs[provider]?.trim();
    if (!apiKey) return;
    const res = await fetch("/api/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey }),
    });
    if (res.ok) {
      setInputs((s) => ({ ...s, [provider]: "" }));
      setMessage(`${PROVIDER_LABELS[provider]} のキーを保存しました`);
      await load();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(data.error ?? "保存に失敗しました");
    }
  }

  async function remove(provider: ProviderId) {
    const res = await fetch("/api/keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    if (res.ok) {
      setMessage(`${PROVIDER_LABELS[provider]} のキーを削除しました`);
      await load();
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">{message}</div>
      )}
      {PROVIDERS.map((provider) => {
        const status = statuses.find((s) => s.provider === provider);
        return (
          <div key={provider} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">{PROVIDER_LABELS[provider]}</h2>
              <StatusBadge status={status} />
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="API キーを入力"
                value={inputs[provider] ?? ""}
                onChange={(e) => setInputs((s) => ({ ...s, [provider]: e.target.value }))}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                onClick={() => save(provider)}
                className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
              >
                保存
              </button>
              {status?.source === "user" && (
                <button
                  onClick={() => remove(provider)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                >
                  削除
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status?: KeyStatus }) {
  if (!status || !status.configured) {
    return <span className="text-xs text-gray-400">未設定</span>;
  }
  if (status.source === "env") {
    return <span className="text-xs text-amber-600">環境変数で設定済み</span>;
  }
  return (
    <span className="text-xs text-green-600">設定済み（…{status.last4}）</span>
  );
}
