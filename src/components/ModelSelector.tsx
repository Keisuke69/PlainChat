"use client";

import {
  MODELS,
  PROVIDERS,
  PROVIDER_LABELS,
  listModelsByProvider,
  type ProviderId,
} from "@/lib/model-registry";

interface Props {
  provider: ProviderId;
  model: string;
  onChange: (provider: ProviderId, model: string) => void;
}

export function ModelSelector({ provider, model, onChange }: Props) {
  function handleProvider(next: ProviderId) {
    const first = listModelsByProvider(next)[0];
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
        {MODELS.filter((m) => m.provider === provider).map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
