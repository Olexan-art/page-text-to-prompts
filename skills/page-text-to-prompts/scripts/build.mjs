#!/usr/bin/env node
// Step 3: node scripts/build.mjs page.json analysis.json --html report.html --md page-prompts.md --json page-prompts.json
// Refuses, listing every problem, unless the analysis passes all checks.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { runChecks } from "./lib/checks.mjs";
import { buildJson, buildMarkdown } from "./lib/outputs.mjs";
import { renderReport } from "./lib/report.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return resolve(i >= 0 ? args[i + 1] : fallback);
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (positional.length < 2) {
  console.error("Usage: node scripts/build.mjs page.json analysis.json [--html report.html] [--md page-prompts.md] [--json page-prompts.json]");
  process.exit(1);
}

const read = (file) => {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    console.log(`REFUSED ${file}: cannot be read as JSON (${error.message})`);
    process.exit(2);
  }
};
const page = read(positional[0]);
const analysis = read(positional[1]);

const checks = runChecks(analysis, page);
if (!checks.ok) {
  const lines = [...checks.schema.map((p) => `schema: ${p}`)];
  for (const [id, problems] of Object.entries(checks.results)) for (const p of problems) lines.push(`${id}: ${p}`);
  console.log(`REFUSED analysis.json: ${lines.length} problem(s)`);
  for (const line of lines) console.log(`  - ${line}`);
  process.exit(2);
}

const html = flag("--html", "report.html");
const md = flag("--md", "page-prompts.md");
const json = flag("--json", "page-prompts.json");
writeFileSync(html, renderReport({ page, analysis, checks }));
writeFileSync(md, buildMarkdown({ page, analysis }));
writeFileSync(json, JSON.stringify(buildJson({ page, analysis }), null, 2));
console.log("checks: 6 of 6 passed");
console.log(`report.html: ${html}`);
console.log(`page-prompts.md: ${md}`);
console.log(`page-prompts.json: ${json}`);
