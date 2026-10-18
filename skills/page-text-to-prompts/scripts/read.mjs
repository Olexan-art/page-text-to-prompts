#!/usr/bin/env node
// Step 1: node scripts/read.mjs <url> --out page.json
//         node scripts/read.mjs --file saved.html [--url https://…] --out page.json
//         --no-render reads the source only. --lang uk sets the draft's language.
// Writes page.json, brief.md (the page as plain lines, word counts included) and analysis.md (the draft).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildBrief, guessType } from "./lib/draft.mjs";
import { draftCompact } from "./lib/compact.mjs";
import { readPage } from "./lib/reading.mjs";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = resolve(flag("--out") || "page.json");
const lang = flag("--lang") || "en";
const file = flag("--file");
const url = file ? flag("--url") : args.find((a, i) => !a.startsWith("--") && !["--out", "--file", "--url", "--lang"].includes(args[i - 1]));

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
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(page, null, 2));
// For the agent: the page as plain lines, and an analysis with every mechanical field filled in.
const briefPath = join(dirname(out), "brief.md");
// A filled analysis from an earlier run is never overwritten: the fresh draft goes beside it.
const draftPath = join(dirname(out), existsSync(join(dirname(out), "analysis.md")) ? "analysis.draft.md" : "analysis.md");
writeFileSync(briefPath, buildBrief(page));
writeFileSync(draftPath, draftCompact(page, guessType, lang));
const v = page.visibility;
const pct = (x) => `${Math.round(x * 100)}%`;
console.log(`page.json: ${out}`);
console.log(`brief.md: ${briefPath}  (read this, not page.json)`);
console.log(`analysis.md: ${draftPath}  (draft: fill it in, one line per element)`);
console.log(`layers: ${page.page.layers.join(" + ")}${page.page.rendered ? ` (${page.page.browser})` : ` (no render: ${page.page.renderReason})`}`);
console.log(`candidates: ${page.blocks.length} blocks, ${page.excluded.length} excluded`);
console.log(`visible words: ${v.totalWords} · js_only ${pct(v.jsOnlyShare)} · collapsed ${pct(v.collapsedShare)} · hidden ${v.hidden.count} · a11y_only ${v.a11yOnly.count}`);
