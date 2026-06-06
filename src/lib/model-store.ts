"use client";

// 設定画面で取得した「利用可能なモデル一覧」をブラウザに保持する（localStorage）。
// 設定画面（更新ボタン）と チャット画面（モデルのプルダウン）は別ページなので、
// localStorage を共有ストアにして橋渡しする。ChatApp はマウント時に読み込み、
// 同一タブ内の更新は CustomEvent で即時反映する。
// サーバから受け取るのは ModelEntry[]（生キーは含まない）。

import type { ModelEntry } from "./model-registry";

const STORAGE_KEY = "plainchat:models:v1";
const EVENT = "plainchat:models-updated";

export function loadDiscoveredModels(): ModelEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ModelEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveDiscoveredModels(models: ModelEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(models));
  window.dispatchEvent(new CustomEvent(EVENT));
}

// 同一タブ内（CustomEvent）と別タブ（storage イベント）の両方で更新を購読する。
export function subscribeDiscoveredModels(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
