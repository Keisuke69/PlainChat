import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlainChat",
  description: "各プロバイダーの API で使える、シンプルなチャット",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
