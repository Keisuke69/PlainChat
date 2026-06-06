#!/bin/bash
# ============================================================
#  PlainChat かんたん起動（Mac 用）
#  このファイルをダブルクリックすると起動します。
# ============================================================

# このスクリプトのある場所（PlainChat フォルダ）へ移動
cd "$(dirname "$0")" || exit 1

pause_and_exit() {
  echo ""
  read -n 1 -s -r -p "何かキーを押すとこのウィンドウを閉じます…"
  echo ""
  exit "$1"
}

echo "============================================"
echo "  PlainChat を起動します"
echo "============================================"
echo ""

# 1) Node.js の確認
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js がインストールされていません。"
  echo "   開いたサイトで「LTS」と書かれた方をダウンロードしてインストールし、"
  echo "   その後もう一度このファイルをダブルクリックしてください。"
  open "https://nodejs.org/ja" >/dev/null 2>&1
  pause_and_exit 1
fi
echo "✅ Node.js を確認しました（$(node -v)）"

# 2) 依存パッケージのインストール（初回のみ・数分かかります）
if [ ! -d node_modules ]; then
  echo "📦 初回セットアップ中です。数分かかります。そのままお待ちください…"
  npm install || { echo "❌ セットアップに失敗しました。"; pause_and_exit 1; }
fi

# 3) 設定ファイル(.env)を自動生成（無い場合のみ）
node scripts/setup-env.mjs || { echo "❌ 設定ファイルの作成に失敗しました。"; pause_and_exit 1; }

# 4) データベースの準備
echo "🗄  データベースを準備中…"
npx prisma migrate deploy >/dev/null 2>&1 || { echo "❌ データベースの準備に失敗しました。"; pause_and_exit 1; }

# 5) 初回ビルド（.next が無い場合のみ・数分かかります）
if [ ! -d .next ]; then
  echo "🔨 初回ビルド中です。数分かかります。そのままお待ちください…"
  npm run build || { echo "❌ ビルドに失敗しました。"; pause_and_exit 1; }
fi

# 6) サーバ起動から少し待ってブラウザを自動で開く
( sleep 4; open "http://localhost:3000" >/dev/null 2>&1 ) &

echo ""
echo "🚀 起動しました！数秒でブラウザが自動的に開きます。"
echo "   開かない場合は、ブラウザで http://localhost:3000 を開いてください。"
echo "   ※ 終了するときは、このウィンドウで Control + C を押してください。"
echo ""

npm run start
