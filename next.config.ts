import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma をサーバ外部パッケージとして扱う（バンドル対象から除外）
  serverExternalPackages: ["@prisma/client", "better-auth"],
};

export default nextConfig;
