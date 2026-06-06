"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signUp } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // アカウント作成時はパスワードの打ち間違い防止のため2回入力させ、一致を確認する。
    if (mode === "signup" && password !== confirmPassword) {
      setError("パスワードが一致しません");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        // 名前は入力させない。Better Auth は name 必須のため空文字を送る。
        const res = await signUp.email({ name: "", email, password });
        if (res.error) {
          setError(res.error.message ?? "登録に失敗しました");
          return;
        }
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) {
          setError(res.error.message ?? "ログインに失敗しました");
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("予期しないエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-bold">PlainChat</h1>
        <p className="mb-6 text-sm text-gray-500">
          {mode === "signin" ? "ログイン" : "アカウント作成"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">メールアドレス</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">パスワード</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                パスワード（確認）
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "処理中…" : mode === "signin" ? "ログイン" : "登録する"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setConfirmPassword("");
          }}
          className="mt-4 w-full text-center text-sm text-gray-500 hover:text-gray-800"
        >
          {mode === "signin"
            ? "アカウントを作成する"
            : "既存アカウントでログイン"}
        </button>
      </div>
    </div>
  );
}
