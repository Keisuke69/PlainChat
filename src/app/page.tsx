import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChatApp } from "@/components/ChatApp";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  // 名前は未入力（空文字）のことがあるため、空ならメールアドレスを表示名にする。
  return <ChatApp userName={session.user.name || session.user.email} />;
}
