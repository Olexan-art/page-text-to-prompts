#!/usr/bin/env node
// Step 3: node scripts/build.mjs page.json analysis.md --html report.html --md page-prompts.md --json page-prompts.json
// Refuses, listing every problem, unless the analysis passes all checks.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { CHECK_IDS, runChecks } from "./lib/checks.mjs";
import { generatePrompt } from "./lib/prompt.mjs";
import { parseCompact } from "./lib/compact.mjs";
import { buildJson, buildMarkdown } from "./lib/outputs.mjs";
import { renderReport } from "./lib/report.mjs";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return resolve(i >= 0 ? args[i + 1] : fallback);
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (positional.length < 2) {
  console.error("Usage: node scripts/build.mjs page.json analysis.md [--html report.html] [--md page-prompts.md] [--json page-prompts.json]");
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
// analysis.md is the short form the agent writes; analysis.json (the full form) is still accepted.
let analysis;
if (/.md$/i.test(positional[1])) {
  const parsed = parseCompact(readFileSync(positional[1], "utf8"), page);
  if (parsed.problems.length) {
    console.log(`REFUSED ${positional[1]}: ${parsed.problems.length} line(s) could not be read`);
    for (const p of parsed.problems) console.log(`  - ${p}`);
    process.exit(2);
  }
  analysis = parsed.analysis;
} else analysis = read(positional[1]);

const checks = runChecks(analysis, page);
if (!checks.ok) {
  const lines = [...checks.schema.map((p) => `schema: ${p}`)];
  for (const [id, problems] of Object.entries(checks.results)) for (const p of problems) lines.push(`${id}: ${p}`);
  console.log(`REFUSED ${positional[1].split(/[\/]/).pop()}: ${lines.length} problem(s)`);
  for (const line of lines) console.log(`  - ${line}`);
  process.exit(2);
}

// The prompts are assembled here from what the agent decided, unless a block carries its own.
for (const block of analysis.blocks) block.prompt = generatePrompt(block, analysis.language);

const html = flag("--html", "report.html");
const md = flag("--md", "page-prompts.md");
const json = flag("--json", "page-prompts.json");
writeFileSync(html, renderReport({ page, analysis, checks }));
writeFileSync(md, buildMarkdown({ page, analysis }));
writeFileSync(json, JSON.stringify(buildJson({ page, analysis }), null, 2));
console.log(`checks: ${CHECK_IDS.length} of ${CHECK_IDS.length} passed`);
if (checks.warnings.length) {
  console.log(`examples: ${checks.warnings.length} element(s) off their range (marked in the report; no fix needed):`);
  for (const w of checks.warnings.slice(0, 12)) console.log(`  - ${w}`);
}
console.log(`report.html: ${html}`);
console.log(`page-prompts.md: ${md}`);
console.log(`page-prompts.json: ${json}`);
