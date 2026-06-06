"use client";

import {
  TRANSPORTS,
  TRANSPORT_LABELS,
  TRANSPORT_DESCRIPTIONS,
  type TransportId,
} from "@/lib/model-registry";

interface Props {
  transport: TransportId;
  onChange: (transport: TransportId) => void;
}

// API リクエストの実行方法（Vercel AI SDK / プロバイダー公式SDK 直接）を切り替える。
export function TransportSelector({ transport, onChange }: Props) {
  return (
    <label
      className="flex items-center gap-1.5 text-sm"
      title={TRANSPORT_DESCRIPTIONS[transport]}
    >
      <span className="text-gray-500">実行方法</span>
      <select
        value={transport}
        onChange={(e) => onChange(e.target.value as TransportId)}
        className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm"
      >
        {TRANSPORTS.map((t) => (
          <option key={t} value={t}>
            {TRANSPORT_LABELS[t]}
          </option>
        ))}
      </select>
    </label>
  );
}
