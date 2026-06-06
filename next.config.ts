import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ネイティブモジュール / サーバ専用ライブラリをバンドル対象から除外する
  // （better-sqlite3 は native addon のためバンドル不可）
  serverExternalPackages: ["better-sqlite3", "better-auth"],
};

export default nextConfig;
