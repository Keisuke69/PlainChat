"use client";

import {
  PROVIDERS,
  PROVIDER_LABELS,
  type ModelEntry,
  type ProviderId,
} from "@/lib/model-registry";

interface Props {
  provider: ProviderId;
  model: string;
  // 選択肢に出すモデル一覧（静的レジストリ + 取得済みモデルをマージしたもの）。
  models: ModelEntry[];
  onChange: (provider: ProviderId, model: string) => void;
}

export function ModelSelector({ provider, model, models, onChange }: Props) {
  function handleProvider(next: ProviderId) {
    const first = models.find((m) => m.provider === next);
    onChange(next, first ? first.id : model);
  }

  return (
    <div className="flex gap-2">
      <select
        value={provider}
        onChange={(e) => handleProvider(e.target.value as ProviderId)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
      >
        {PROVIDERS.map((p) => (
          <option key={p} value={p}>
            {PROVIDER_LABELS[p]}
          </option>
        ))}
      </select>
      <select
        value={model}
        onChange={(e) => onChange(provider, e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
      >
        {models
          .filter((m) => m.provider === provider)
          .map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
      </select>
    </div>
  );
}
