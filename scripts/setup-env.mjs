// .env が無ければ、安全なランダムシークレットを自動生成して作成する。
// 非エンジニアが手で .env を編集しなくて済むようにするための補助スクリプト。
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const path = ".env";

if (existsSync(path)) {
  console.log("設定ファイル(.env)は既にあります。そのまま使用します。");
  process.exit(0);
}

const secret = randomBytes(32).toString("hex");
const encKey = randomBytes(32).toString("hex");

const content = [
  'DATABASE_URL="file:./dev.db"',
  `BETTER_AUTH_SECRET="${secret}"`,
  'BETTER_AUTH_URL="http://localhost:3000"',
  `ENCRYPTION_KEY="${encKey}"`,
  "",
].join("\n");

writeFileSync(path, content, { encoding: "utf8" });
console.log("設定ファイル(.env)を自動生成しました（ランダムなシークレット入り）。");
