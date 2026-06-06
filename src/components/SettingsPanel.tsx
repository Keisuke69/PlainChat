"use client";

import type { ChatParams, ModelEntry } from "@/lib/model-registry";

interface Props {
  entry: ModelEntry | undefined;
  systemPrompt: string;
  params: ChatParams;
  forceAllParams: boolean;
  onSystemPromptChange: (v: string) => void;
  onParamsChange: (p: ChatParams) => void;
  onForceAllParamsChange: (v: boolean) => void;
}

const EFFORTS: ChatParams["effort"][] = ["low", "medium", "high", "xhigh", "max"];

export function SettingsPanel({
  entry,
  systemPrompt,
  params,
  forceAllParams,
  onSystemPromptChange,
  onParamsChange,
  onForceAllParamsChange,
}: Props) {
  if (!entry) return null;

  function update(patch: Partial<ChatParams>) {
    onParamsChange({ ...params, ...patch });
  }

  // 数値パラメータをクリア（未指定 = 送らない）。
  function clear(key: keyof ChatParams) {
    const next = { ...params };
    delete next[key];
    onParamsChange(next);
  }

  // 表示判定: 全パラメータ表示トグル ON ならモデルの supports に関わらず出す。
  const show = (k: keyof ModelEntry["supports"]) => forceAllParams || entry.supports[k];

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

        <label className="flex items-start gap-2 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={forceAllParams}
            onChange={(e) => onForceAllParamsChange(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            全パラメータを表示
            <span className="block text-gray-400">
              ※ 非対応モデルでも強制表示・送信され、API が 400 を返す場合があります
            </span>
          </span>
        </label>

        {show("temperature") && (
          <RangeRow
            label="temperature"
            min={0}
            max={2}
            step={0.1}
            value={params.temperature ?? entry.defaults.temperature ?? 1}
            onChange={(v) => update({ temperature: v })}
          />
        )}

        {show("topP") && (
          <RangeRow
            label="top_p"
            min={0}
            max={1}
            step={0.05}
            value={params.topP ?? entry.defaults.topP ?? 1}
            onChange={(v) => update({ topP: v })}
          />
        )}

        {show("maxTokens") && (
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

        {show("seed") && (
          <div>
            <label className="mb-1 block font-medium">seed</label>
            <input
              type="number"
              value={params.seed ?? ""}
              placeholder="未指定"
              onChange={(e) =>
                e.target.value === ""
                  ? clear("seed")
                  : update({ seed: Number(e.target.value) })
              }
              className="w-32 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
        )}

        {show("topK") && (
          <div>
            <label className="mb-1 block font-medium">top_k</label>
            <input
              type="number"
              min={0}
              step={1}
              value={params.topK ?? ""}
              placeholder="未指定"
              onChange={(e) =>
                e.target.value === ""
                  ? clear("topK")
                  : update({ topK: Number(e.target.value) })
              }
              className="w-32 rounded-md border border-gray-300 px-2 py-1"
            />
          </div>
        )}

        {show("thinkingEffort") && (
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
