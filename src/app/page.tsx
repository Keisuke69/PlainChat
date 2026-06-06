import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ChatApp } from "@/components/ChatApp";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/login");
  }

  return <ChatApp userName={session.user.name ?? session.user.email} />;
}
