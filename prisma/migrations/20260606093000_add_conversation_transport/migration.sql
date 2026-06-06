-- AlterTable
-- 会話ごとに API 実行方法（'sdk' | 'direct'）を保存する。既存行は既定の 'sdk' になる。
ALTER TABLE "Conversation" ADD COLUMN "transport" TEXT NOT NULL DEFAULT 'sdk';
