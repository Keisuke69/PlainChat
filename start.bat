@echo off
chcp 65001 >nul
setlocal
rem ============================================================
rem  PlainChat かんたん起動（Windows 用）
rem  このファイルをダブルクリックすると起動します。
rem ============================================================

cd /d "%~dp0"

echo ============================================
echo   PlainChat を起動します
echo ============================================
echo.

rem 1) Node.js の確認
where node >nul 2>nul
if errorlevel 1 (
  echo [×] Node.js がインストールされていません。
  echo     開いたサイトで「LTS」と書かれた方をインストールし、
  echo     その後もう一度このファイルをダブルクリックしてください。
  start "" "https://nodejs.org/ja"
  pause
  exit /b 1
)
echo [OK] Node.js を確認しました

rem 2) 依存パッケージのインストール（初回のみ・数分かかります）
if not exist node_modules (
  echo 初回セットアップ中です。数分かかります。そのままお待ちください...
  call npm install
  if errorlevel 1 ( echo [×] セットアップに失敗しました & pause & exit /b 1 )
)

rem 3) 設定ファイル(.env)を自動生成（無い場合のみ）
call node scripts\setup-env.mjs
if errorlevel 1 ( echo [×] 設定ファイルの作成に失敗しました & pause & exit /b 1 )

rem 4) データベースの準備
echo データベースを準備中...
call npx prisma migrate deploy >nul 2>nul
if errorlevel 1 ( echo [×] データベースの準備に失敗しました & pause & exit /b 1 )

rem 5) 初回ビルド（.next が無い場合のみ・数分かかります）
if not exist .next (
  echo 初回ビルド中です。数分かかります。そのままお待ちください...
  call npm run build
  if errorlevel 1 ( echo [×] ビルドに失敗しました & pause & exit /b 1 )
)

rem 6) サーバ起動から少し待ってブラウザを自動で開く
start "" cmd /c "timeout /t 6 >nul && start """" http://localhost:3000"

echo.
echo 起動しました！数秒でブラウザが自動的に開きます。
echo   開かない場合は、ブラウザで http://localhost:3000 を開いてください。
echo   ※ 終了するときは、このウィンドウで Ctrl + C を押してください。
echo.

call npm run start
