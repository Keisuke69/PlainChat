"use client";

import type { ChatParams, ModelEntry } from "@/lib/model-registry";

interface Props {
  entry: ModelEntry | undefined;
  systemPrompt: string;
  params: ChatParams;
  onSystemPromptChange: (v: string) => void;
  onParamsChange: (p: ChatParams) => void;
}

const EFFORTS: ChatParams["effort"][] = ["low", "medium", "high", "xhigh", "max"];

export function SettingsPanel({
  entry,
  systemPrompt,
  params,
  onSystemPromptChange,
  onParamsChange,
}: Props) {
  if (!entry) return null;

  function update(patch: Partial<ChatParams>) {
    onParamsChange({ ...params, ...patch });
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="mb-1 block font-medium">システムプロンプト</label>
        <textarea
          value={systemPrompt}
          onChange={(e) => onSystemPromptChange(e.target.value)}
          rows={5}
          placeholder="例: あなたは丁寧な日本語アシスタントです。"
          className="w-full resize-y rounded-md border border-gray-300 px-3 py-2"
        />
      </div>

      <div className="space-y-3 border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-500">
          このモデルで有効なパラメータのみ表示しています。
        </p>

        {entry.supports.temperature && (
          <RangeRow
            label="temperature"
            min={0}
            max={2}
            step={0.1}
            value={params.temperature ?? entry.defaults.temperature ?? 1}
            onChange={(v) => update({ temperature: v })}
          />
        )}

        {entry.supports.topP && (
          <RangeRow
            label="top_p"
            min={0}
            max={1}
            step={0.05}
            value={params.topP ?? entry.defaults.topP ?? 1}
            onChange={(v) => update({ topP: v })}
          />
        )}

        {entry.supports.maxTokens && (
          <div>
            <label className="mb-1 block font-medium">max tokens</label>
            <input
              type="number"
              min={1}
              max={128000}
              value={params.maxTokens ?? entry.defaults.maxTokens}
              onChange={(e) => update({ maxTokens: Number(e.target.value) })}
              className="w-32 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
        )}

        {entry.supports.thinkingEffort && (
          <div>
            <label className="mb-1 block font-medium">effort</label>
            <select
              value={params.effort ?? "high"}
              onChange={(e) => update({ effort: e.target.value as ChatParams["effort"] })}
              className="rounded-md border border-gray-300 bg-white px-2 py-1"
            >
              {EFFORTS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              ※ UI 表示のみ（現状 API へは未送信）
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="font-medium">{label}</label>
        <span className="text-xs text-gray-500">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}
