import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { countWords, countChars, rangeVerdict, shingles } from "../scripts/lib/text.mjs";
import { unitStatus, classifyUnits, segment } from "../scripts/lib/layers.mjs";
import { staticUnits, sourceKey, keyContains, pageFields } from "../scripts/lib/staticLayer.mjs";
import { runChecks, brandTerms } from "../scripts/lib/checks.mjs";
import { renderReport } from "../scripts/lib/report.mjs";
import { buildMarkdown, buildJson } from "../scripts/lib/outputs.mjs";
import { readPage } from "../scripts/lib/reading.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(join(here, "fixtures", name), "utf8");
const studioHtml = fixture("studio.html");
const analysis = () => JSON.parse(fixture("studio-analysis.json"));

async function studioPage() {
  const result = await readPage({ html: studioHtml, url: "https://studiora.example/" }, { render: false });
  assert.equal(result.ok, true);
  return result.page;
}

test("words are tokens with a letter or digit; separators are not words", () => {
  assert.equal(countWords("Щомісяця · Щороку"), 2);
  assert.equal(countWords("Учні записуються самі — ви ведете"), 5);
  assert.equal(countChars("  a   b  "), 3);
});

test("range verdicts allow 20% either side", () => {
  assert.equal(rangeVerdict(5, [4, 6]), "in");
  assert.equal(rangeVerdict(7, [4, 6]), "near");
  assert.equal(rangeVerdict(9, [4, 6]), "out");
});

test("shingles are runs of key tokens", () => {
  assert.deepEqual(shingles("One, two three four", 3), ["one two three", "two three four"]);
});

test("unit status follows the three layers", () => {
  assert.equal(unitStatus({ visible: true, inHtml: true, inA11y: true }), "ok");
  assert.equal(unitStatus({ visible: true, inHtml: false, inA11y: true }), "js_only");
  assert.equal(unitStatus({ visible: true, inHtml: true, inA11y: false }), "not_in_a11y");
  assert.equal(unitStatus({ visible: false, collapsed: "details" }), "collapsed");
  assert.equal(unitStatus({ visible: false, collapsed: null }), "hidden");
});

test("source matching ignores where spaces fall", () => {
  const key = sourceKey("<p>Hard rule<span>GetLoopLoop</span> does not replace</p>");
  assert.equal(keyContains(key, "Hard rule GetLoopLoop does not replace"), true);
  assert.equal(keyContains(key, "Something else"), false);
});

test("the fixture page cuts into its nine sections and drops header and footer", async () => {
  const page = await studioPage();
  assert.equal(page.blocks.length, 9);
  assert.deepEqual(page.excluded.map((e) => e.reason).sort(), ["header", "legal"]);
  const faq = page.blocks[7];
  assert.ok(faq.statusWords.collapsed > 0, "closed <details> answers are collapsed");
  const pricing = page.blocks[6];
  const groups = new Set(pricing.elements.map((e) => e.group).filter(Boolean));
  assert.equal(groups.size, 1, "the three plans are one group of cards");
});

test("page fields and brand terms come from the source", () => {
  const f = pageFields(studioHtml, "https://studiora.example/");
  assert.equal(f.og.siteName, "Studiora");
  assert.deepEqual(brandTerms({ page: f }), ["studiora"]);
});

test("the fixture analysis passes every check", async () => {
  const page = await studioPage();
  const checks = runChecks(analysis(), page);
  assert.equal(checks.ok, true, JSON.stringify(checks, null, 2));
});

test("overlap refuses six words copied from the page", async () => {
  const page = await studioPage();
  const a = analysis();
  a.blocks[0].role = "Your students book on their own while you teach, says the page";
  const { results } = runChecks(a, page);
  assert.equal(results.overlap.length, 1);
});

test("brand refuses the site's name", async () => {
  const page = await studioPage();
  const a = analysis();
  a.blocks[2].techniques.push("Пиши так, як Studiora.");
  assert.ok(runChecks(a, page).results.brand.length >= 1);
});

test("variables refuse an undeclared name and an unmarked fact", async () => {
  const page = await studioPage();
  const a = analysis();
  a.blocks[0].prompt += " {mystery}";
  a.variables.risk_remover.fact = false;
  const problems = runChecks(a, page).results.variables;
  assert.ok(problems.some((p) => p.includes("{mystery}")));
  assert.ok(problems.some((p) => p.includes("risk_remover")));
});

test("example refuses an element far outside its range and a missing card", async () => {
  const page = await studioPage();
  const a = analysis();
  a.blocks[0].example[1].text = "Коротко";
  a.blocks[2].example[1].items.pop();
  const problems = runChecks(a, page).results.example;
  assert.ok(problems.some((p) => p.includes("p01 › h1")));
  assert.ok(problems.some((p) => p.includes("2 items")));
});

test("volume refuses a leaf without a character range", async () => {
  const page = await studioPage();
  const a = analysis();
  delete a.blocks[0].structure[0].chars;
  assert.ok(runChecks(a, page).results.volume.length >= 1);
});

test("blocks refuses a candidate used twice or never", async () => {
  const page = await studioPage();
  const a = analysis();
  a.blocks[1].source_blocks = ["b01"];
  const problems = runChecks(a, page).results.blocks;
  assert.ok(problems.some((p) => p.includes("used twice")));
  assert.ok(problems.some((p) => p.includes('"b02"')));
});

test("the report, markdown and json render from the fixture", async () => {
  const page = await studioPage();
  const a = analysis();
  const html = renderReport({ page, analysis: a, checks: runChecks(a, page) });
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes('class="motanka"'));
  assert.ok(html.includes("x.com/Looploopnow"));
  assert.ok(!/<script src=/.test(html), "no external scripts");
  assert.equal((html.match(/class="blk"/g) || []).length, 9);
  assert.ok(buildMarkdown({ page, analysis: a }).includes("```"));
  assert.equal(buildJson({ page, analysis: a }).blocks.length, 9);
});
