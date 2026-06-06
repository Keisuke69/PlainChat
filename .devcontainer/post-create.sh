#!/usr/bin/env bash
# Dev Container 作成後の初期セットアップ（postCreateCommand から呼ばれる）
set -euo pipefail

# named volume はマウント直後 root 所有になるため、node ユーザーに付け替える
sudo chown node:node node_modules .next

# 依存パッケージの導入（node_modules はボリューム上なので2回目以降は高速）
npm install

# .env が無ければランダムシークレット付きで自動生成
node scripts/setup-env.mjs

# DB 初期化（既存マイグレーションを適用 + Prisma Client 生成）
npx prisma migrate deploy
npx prisma generate

echo "✅ セットアップ完了。'npm run dev' で http://localhost:3000 が起動します。"
echo "   （初期ユーザーが必要なら 'npx prisma db seed' → demo@example.com / password123）"
