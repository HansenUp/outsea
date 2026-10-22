// Applies drizzle/*.sql to the normal local D1 state (.wrangler/state) in order,
// skipping files already recorded in .wrangler/state/schema-applied.json.
// Demo mode uses its own isolated state via scripts/init-demo.mjs.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const stateDir = ".wrangler/state";
const config = "dist/server/wrangler.json";
if (!existsSync(root + config)) throw new Error(`Missing ${config}; run "npm run build" first.`);
mkdirSync(root + stateDir, { recursive: true });
const marker = root + stateDir + "/schema-applied.json";
const applied = existsSync(marker) ? JSON.parse(readFileSync(marker, "utf8")) : [];
for (const name of readdirSync(root + "drizzle").filter((n) => n.endsWith(".sql")).sort()) {
  if (applied.includes(name)) continue;
  console.log("[migrate-local] applying", name);
  const r = spawnSync(process.execPath, [
    "--import", root + "scripts/wrangler-env.mjs", root + "node_modules/wrangler/bin/wrangler.js",
    "d1", "execute", "DB", "--local", "--config", config, "--persist-to", stateDir, "--file", "drizzle/" + name,
  ], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`Migration ${name} failed:\n${r.stdout}${r.stderr}`);
  applied.push(name);
  writeFileSync(marker, JSON.stringify(applied));
}
console.log("[migrate-local] up to date:", applied.length, "migrations");
