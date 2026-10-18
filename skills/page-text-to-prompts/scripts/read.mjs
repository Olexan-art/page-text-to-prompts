#!/usr/bin/env node
// Step 1: node scripts/read.mjs <url> --out page.json
//         node scripts/read.mjs --file saved.html [--url https://…] --out page.json
//         --no-render reads the source only.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { readPage } from "./lib/reading.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = resolve(flag("--out") || "page.json");
const file = flag("--file");
const url = file ? flag("--url") : args.find((a, i) => !a.startsWith("--") && !["--out", "--file", "--url"].includes(args[i - 1]));

if (!file && !url) {
  console.error("Usage: node scripts/read.mjs <url> --out page.json   (or --file saved.html)");
  process.exit(1);
}

const input = file ? { html: readFileSync(file, "utf8"), url: url || null } : { url };
const result = await readPage(input, { render: !args.includes("--no-render") });

if (!result.ok) {
  console.log(`REFUSED ${result.reasonCode}${result.status ? ` ${result.status}` : ""}`);
  process.exit(2);
}

const { page } = result;
writeFileSync(out, JSON.stringify(page, null, 2));
const v = page.visibility;
const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`page.json: ${out}`);
console.log(`layers: ${page.page.layers.join(" + ")}${page.page.rendered ? ` (${page.page.browser})` : ` (no render: ${page.page.renderReason})`}`);
console.log(`candidates: ${page.blocks.length} blocks, ${page.excluded.length} excluded`);
console.log(`visible words: ${v.totalWords} · js_only ${pct(v.jsOnlyShare)} · collapsed ${pct(v.collapsedShare)} · hidden ${v.hidden.count} · a11y_only ${v.a11yOnly.count}`);
