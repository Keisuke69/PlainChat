"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  MODELS,
  getModelEntry,
  isTransportId,
  DEFAULT_TRANSPORT,
  type ChatParams,
  type ProviderId,
  type TransportId,
} from "@/lib/model-registry";
import { ModelSelector } from "./ModelSelector";
import { TransportSelector } from "./TransportSelector";
import { SettingsPanel } from "./SettingsPanel";
import {
  ConversationSidebar,
  type ConversationSummary,
} from "./ConversationSidebar";

const DEFAULT = MODELS[0];

interface DbMessage {
  id: string;
  role: string;
  content: string;
}

export function ChatApp({ userName }: { userName: string }) {
  const [provider, setProvider] = useState<ProviderId>(DEFAULT.provider);
  const [model, setModel] = useState<string>(DEFAULT.id);
  const [transport, setTransport] = useState<TransportId>(DEFAULT_TRANSPORT);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [params, setParams] = useState<ChatParams>({
    maxTokens: DEFAULT.defaults.maxTokens,
  });
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const entry = useMemo(() => getModelEntry(provider, model), [provider, model]);

  // 送信時の最新設定を参照するための ref
  const settingsRef = useRef({ provider, model, transport, systemPrompt, params, currentId });
  settingsRef.current = { provider, model, transport, systemPrompt, params, currentId };

  const { messages, sendMessage, status, setMessages, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onFinish: () => {
      void loadConversations();
    },
  });

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = (await res.json()) as { conversations: ConversationSummary[] };
      setConversations(data.conversations);
    }
  }

  useEffect(() => {
    void loadConversations();
  }, []);

  async function createConversation(): Promise<string | null> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, transport, systemPrompt, params }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { conversation: ConversationSummary };
    setConversations((prev) => [data.conversation, ...prev]);
    return data.conversation.id;
  }

  function handleNew() {
    setCurrentId(null);
    setMessages([]);
    setInput("");
  }

  async function handleSelect(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    if (!res.ok) return;
    const data = (await res.json()) as {
      conversation: {
        id: string;
        provider: string;
        model: string;
        transport: string;
        systemPrompt: string;
        params: string;
        messages: DbMessage[];
      };
    };
    const c = data.conversation;
    setProvider(c.provider as ProviderId);
    setModel(c.model);
    setTransport(isTransportId(c.transport) ? c.transport : DEFAULT_TRANSPORT);
    setSystemPrompt(c.systemPrompt);
    try {
      setParams(JSON.parse(c.params) as ChatParams);
    } catch {
      setParams({});
    }
    setCurrentId(c.id);
    setMessages(
      c.messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map(
          (m) =>
            ({
              id: m.id,
              role: m.role as "user" | "assistant",
              parts: [{ type: "text", text: m.content }],
            }) as UIMessage,
        ),
    );
  }

  async function handleDelete(id: string) {
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (currentId === id) handleNew();
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || status === "streaming" || status === "submitted") return;

    let convId = currentId;
    if (!convId) {
      convId = await createConversation();
      if (!convId) return;
      setCurrentId(convId);
    }

    setInput("");
    sendMessage(
      { text },
      {
        body: {
          conversationId: convId,
          provider,
          model,
          transport,
          systemPrompt,
          params,
        },
      },
    );
  }

  const busy = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-screen">
      <ConversationSidebar
        conversations={conversations}
        currentId={currentId}
        userName={userName}
        onSelect={handleSelect}
        onNew={handleNew}
        onDelete={handleDelete}
      />

      <main className="flex flex-1 flex-col">
        {/* ヘッダー: モデル選択 + API 実行方法の切替 */}
        <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
          <ModelSelector
            provider={provider}
            model={model}
            onChange={(p, m) => {
              setProvider(p);
              setModel(m);
            }}
          />
          <span className="h-5 w-px bg-gray-200" aria-hidden />
          <TransportSelector transport={transport} onChange={setTransport} />
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* メッセージ一覧 */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.length === 0 && (
                <p className="mt-10 text-center text-sm text-gray-400">
                  メッセージを入力して検証を開始してください
                </p>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  エラー: {error.message}（API キー未設定の場合は設定画面で登録してください）
                </div>
              )}
            </div>

            {/* 入力欄 */}
            <form
              onSubmit={handleSend}
              className="border-t border-gray-200 bg-white p-3"
            >
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handleSend(e);
                    }
                  }}
                  rows={2}
                  placeholder="メッセージを入力（Cmd/Ctrl + Enter で送信）"
                  className="flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="self-end rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
                >
                  {busy ? "送信中…" : "送信"}
                </button>
              </div>
            </form>
          </div>

          {/* 設定パネル */}
          <div className="w-80 overflow-y-auto border-l border-gray-200 bg-white p-4">
            <SettingsPanel
              entry={entry}
              systemPrompt={systemPrompt}
              params={params}
              onSystemPromptChange={setSystemPrompt}
              onParamsChange={setParams}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const text = message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
          isUser ? "bg-gray-900 text-white" : "border border-gray-200 bg-white"
        }`}
      >
        {text || (isUser ? "" : "…")}
      </div>
    </div>
  );
}
