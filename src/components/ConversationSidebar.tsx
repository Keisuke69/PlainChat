"use client";

import Link from "next/link";
import { signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export interface ConversationSummary {
  id: string;
  title: string;
  provider: string;
  model: string;
  updatedAt: string;
}

interface Props {
  conversations: ConversationSummary[];
  currentId: string | null;
  userName: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export function ConversationSidebar({
  conversations,
  currentId,
  userName,
  onSelect,
  onNew,
  onDelete,
}: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-white">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
        >
          ＋ 新しいチャット
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {conversations.length === 0 && (
          <p className="px-2 py-4 text-xs text-gray-400">会話はまだありません</p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`group mb-1 flex items-center rounded-md ${
              c.id === currentId ? "bg-gray-100" : "hover:bg-gray-50"
            }`}
          >
            <button
              onClick={() => onSelect(c.id)}
              className="flex-1 truncate px-3 py-2 text-left text-sm"
              title={c.title}
            >
              {c.title}
            </button>
            <button
              onClick={() => onDelete(c.id)}
              className="px-2 text-xs text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100"
              title="削除"
            >
              ✕
            </button>
          </div>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3 text-sm">
        <div className="mb-2 truncate text-gray-600" title={userName}>
          {userName}
        </div>
        <div className="flex items-center justify-between">
          <Link href="/settings" className="text-blue-600 hover:underline">
            設定
          </Link>
          <button onClick={handleSignOut} className="text-gray-500 hover:text-gray-800">
            ログアウト
          </button>
        </div>
      </div>
    </aside>
  );
}
