// analysis.md: the short form the agent writes. One line per element, no JSON, no prompt, no
// character ranges (derived from the page), one example card per group. parseCompact turns it into
// the analysis object the checks and the report use; serializeCompact goes the other way.
//
//   language: en
//   example_product: a fictional booking app for small pilates studios
//   page_type: SaaS landing
//   audience: owners of small studios who book by chat
//   awareness: comparing_solutions
//   tone: businesslike, warm; formality 2; you
//   promise: {product} gives {audience} {main_benefit} without {pain}.
//   logic: why the blocks stand in this order
//   threads:
//   - the promise of no calls returns in the hero, the steps and the closing call
//   vars:
//   - session_type: the kind of class sold [fact]
//   drop: b10 newsletter strip repeated from the footer
//
//   ## p01 hero | Hero | b01
//   role: say within five seconds what changes for the reader
//   - eyebrow "Eyebrow" | 3-5 | the main change for the reader | No more booking calls
//   - risk_line | 5-8 | {risk_remover} | Free to start, cancel at any time
//   - 3 x card "Plan":
//     - h3 | 1-3 | the studio's size | Single room
//     - items 3 | 2-6 | what is included | Self-service reservations / Client reminders / Card checkout
//   techniques:
//   - Keep {product}'s name out of the headline.
//   tone: businesslike, warm; you
//   avoid: "innovative"; a question as the headline

import { FACT_VARIABLES } from "./checks.mjs";
import { countChars, countWords } from "./text.mjs";

/** The canonical variables every analysis may use without declaring them. */
export const CANONICAL_VARIABLES = {
  product: ["the product's name and what it is, in a few words", false],
  category: ["the kind of product", false],
  audience: ["who reads the page: role and situation", false],
  language: ["the language the block is written in", false],
  pain: ["the reader's main problem", false],
  pain_n: ["further problems, numbered", false],
  main_benefit: ["the main result the reader gets", false],
  benefit_n: ["further results, numbered", false],
  feature_n: ["what the product does, numbered", false],
  step_n: ["steps to start or use it, numbered", false],
  use_case_n: ["a role or scenario the product serves", false],
  alternative: ["what the reader does today instead", false],
  objection_n: ["a doubt the reader has, numbered", false],
  cta_action: ["the action the button asks for", false],
  risk_remover: ["what makes the first step safe", true],
  outcome_number: ["a measured result", true],
  customer_count: ["how many customers or users", true],
  customer_n: ["a named customer or logo", true],
  testimonial_n: ["a real quote with name, role, company", true],
  plan_n: ["a plan's name, price and what it includes", true],
  guarantee: ["what is guaranteed and on what terms", true],
  deadline: ["a real date or limit, for urgency", true],
};

// Only " | " separates fields: a middle dot appears inside examples ("Monthly · Annually").
const SEP = /\s*\|\s*/;
const range = (s) => {
  const m = String(s || "").match(/(\d+)\s*[-–]\s*(\d+)|^(\d+)$/);
  if (!m) return null;
  return m[3] ? [Number(m[3]), Number(m[3])] : [Number(m[1]), Number(m[2])];
};

/** Average characters per word on the page, spaces included, for deriving character ranges. */
export function charsPerWord(page) {
  let words = 0;
  let chars = 0;
  for (const b of page?.blocks || []) for (const e of b.elements) {
    words += e.words;
    chars += e.chars + 1;
  }
  return words ? chars / words : 6.5;
}
const charRange = (w, cpw) => [Math.max(1, Math.floor(w[0] * cpw * 0.8)), Math.ceil(w[1] * cpw * 1.25)];

/** One element line: `code "Label" | 3-5 | must | example` (or `items 3 | …`). */
function parseLeaf(text, cpw, where, problems) {
  const parts = text.split(SEP);
  const head = parts[0].trim();
  const m = head.match(/^([a-z][a-z0-9_]*)(?:\s+(\d+(?:\s*[-–]\s*\d+)?))?(?:\s+"([^"]*)")?$/i);
  if (!m) {
    problems.push(`${where}: cannot read "${head}" (expected: code "Label" | 3-5 | must | example)`);
    return null;
  }
  const [, code, itemsRaw, label] = m;
  const words = range(parts[1]);
  if (!words) problems.push(`${where} ${code}: the word range "${parts[1] ?? ""}" is not like 3-5`);
  const leaf = { element: code.toLowerCase(), ...(label ? { label } : {}), words: words || [1, 1], chars: charRange(words || [1, 1], cpw), must: (parts[2] || "").trim() };
  if (code.toLowerCase() === "items" || itemsRaw) leaf.items = range(itemsRaw) || [3, 3];
  if (FACT_VARIABLES.some((f) => leaf.must.includes(`{${f}}`))) leaf.fact = true;
  const example = parts.slice(3).join(" | ").trim();
  return { leaf, example: leaf.items ? example.split(/\s+\/\s+/).filter(Boolean) : example };
}

/** Parse analysis.md. Returns { analysis, problems }. */
export function parseCompact(text, page) {
  const cpw = charsPerWord(page);
  const problems = [];
  const a = { language: "en", example_product: "", profile: { tone: {}, threads: [], skeleton: [] }, variables: {}, dropped: [], blocks: [] };
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let block = null;
  let list = null; // where "- …" lines go: threads, techniques, vars, or the structure
  let group = null;
  const tone = (s) => {
    const out = { adjectives: [], formality: 2, address: "" };
    for (const part of String(s).split(";").map((x) => x.trim()).filter(Boolean)) {
      const f = part.match(/^formality\s+(\d)/i);
      if (f) out.formality = Number(f[1]);
      else if (!out.adjectives.length) out.adjectives = part.split(",").map((x) => x.trim()).filter(Boolean);
      else out.address = part;
    }
    return out;
  };

  lines.forEach((raw, n) => {
    const where = `line ${n + 1}`;
    if (!raw.trim() || raw.trim().startsWith("<!--")) return;
    const h = raw.match(/^##\s+(.+)$/);
    if (h) {
      const parts = h[1].split(SEP).map((x) => x.trim());
      const [id, type] = parts[0].split(/\s+/);
      block = { id, block_type: type || "", name: parts[1] || "", source_blocks: (parts[2] || "").split(/[\s,+]+/).filter(Boolean), role: "", structure: [], techniques: [], tone: { adjectives: [], formality: 2, address: "" }, avoids: [], example: [] };
      a.blocks.push(block);
      list = "structure";
      group = null;
      return;
    }
    const indented = /^\s{2,}-\s+/.test(raw);
    const item = raw.match(/^\s*-\s+(.*)$/);
    if (item) {
      const body = item[1].trim();
      if (!body) return; // an empty "- " left from the draft
      if (!block) {
        if (list === "threads") a.profile.threads.push(body);
        else if (list === "vars") {
          const v = body.match(/^([a-z][a-z0-9_]*)\s*:\s*(.*?)(\s*\[fact\])?$/i);
          if (v) a.variables[v[1]] = { means: v[2].trim(), fact: Boolean(v[3]) };
          else problems.push(`${where}: a variable line reads "name: what goes in" (add [fact] for a fact)`);
        }
        return;
      }
      if (list === "techniques") {
        block.techniques.push(body);
        return;
      }
      const g = body.match(/^(\d+)\s*[x×]\s*([a-z][a-z0-9_]*)(?:\s+"([^"]*)")?\s*:\s*$/i);
      if (g && !indented) {
        group = { element: g[2].toLowerCase(), ...(g[3] ? { label: g[3] } : {}), count: Number(g[1]), children: [] };
        block.structure.push(group);
        block.example.push({ element: group.element, items: [[]] });
        return;
      }
      const parsed = parseLeaf(body, cpw, `${block.id} ${where}`, problems);
      if (!parsed) return;
      if (indented && group) {
        group.children.push(parsed.leaf);
        const card = block.example[block.example.length - 1].items[0];
        card.push(parsed.leaf.items ? { element: parsed.leaf.element, list: parsed.example } : { element: parsed.leaf.element, text: parsed.example });
      } else {
        group = null;
        block.structure.push(parsed.leaf);
        block.example.push(parsed.leaf.items ? { element: parsed.leaf.element, list: parsed.example } : { element: parsed.leaf.element, text: parsed.example });
      }
      return;
    }
    const kv = raw.match(/^([a-z_]+)\s*:\s*(.*)$/i);
    if (!kv) {
      problems.push(`${where}: cannot read "${raw.trim().slice(0, 60)}"`);
      return;
    }
    const [, key, value] = kv;
    const k = key.toLowerCase();
    if (block) {
      if (k === "role") block.role = value.trim();
      else if (k === "techniques") list = "techniques";
      else if (k === "tone") block.tone = tone(value);
      else if (k === "avoid" || k === "avoids") block.avoids = value.split(";").map((x) => x.trim()).filter(Boolean);
      else if (k === "prompt") block.prompt = value.trim();
      else problems.push(`${block.id} ${where}: unknown field "${key}"`);
      if (k !== "techniques") list = "structure";
      return;
    }
    if (k === "language") a.language = value.trim();
    else if (k === "example_product") a.example_product = value.trim();
    else if (k === "page_type") a.profile.page_type = value.trim();
    else if (k === "audience") a.profile.audience = value.trim();
    else if (k === "awareness") a.profile.awareness = value.trim();
    else if (k === "tone") a.profile.tone = tone(value);
    else if (k === "promise") a.profile.main_promise = value.trim();
    else if (k === "logic") a.profile.persuasion_logic = value.trim();
    else if (k === "threads") list = "threads";
    else if (k === "vars") list = "vars";
    else if (k === "drop") {
      const [id, ...why] = value.trim().split(/\s+/);
      a.dropped.push({ id, reason: why.join(" ") });
    } else problems.push(`${where}: unknown field "${key}"`);
  });

  // Canonical variables are always declared; extra ones come from vars:.
  a.variables = { ...Object.fromEntries(Object.entries(CANONICAL_VARIABLES).map(([k, [means, fact]]) => [k, { means, fact }])), ...a.variables };
  a.profile.skeleton = a.blocks.map((b) => b.block_type);
  return { analysis: a, problems };
}

/** The analysis object as analysis.md, for tests and for turning an old analysis.json into the short form. */
export function serializeCompact(a) {
  const out = [];
  const p = a.profile || {};
  const tone = (t) => [(t?.adjectives || []).join(", "), t?.formality ? `formality ${t.formality}` : "", t?.address || ""].filter(Boolean).join("; ");
  out.push(`language: ${a.language}`, `example_product: ${a.example_product}`, `page_type: ${p.page_type || ""}`, `audience: ${p.audience || ""}`, `awareness: ${p.awareness || ""}`, `tone: ${tone(p.tone)}`, `promise: ${p.main_promise || ""}`, `logic: ${p.persuasion_logic || ""}`);
  if ((p.threads || []).length) out.push("threads:", ...p.threads.map((x) => `- ${x}`));
  const extra = Object.entries(a.variables || {}).filter(([k]) => !CANONICAL_VARIABLES[k]);
  if (extra.length) out.push("vars:", ...extra.map(([k, v]) => `- ${k}: ${v.means}${v.fact ? " [fact]" : ""}`));
  for (const d of a.dropped || []) out.push(`drop: ${d.id} ${d.reason}`);
  const leaf = (el, ex, indent) => {
    const head = `${el.element}${el.items && el.element !== "items" ? ` ${el.items[0]}` : el.items ? ` ${el.items[0]}-${el.items[1]}` : ""}${el.label ? ` "${el.label}"` : ""}`;
    const example = el.items ? (ex?.list || []).join(" / ") : ex?.text || "";
    return `${indent}- ${head} | ${el.words[0]}-${el.words[1]} | ${el.must || ""} | ${example}`;
  };
  for (const b of a.blocks || []) {
    out.push("", `## ${b.id} ${b.block_type} | ${b.name} | ${(b.source_blocks || []).join(" ")}`, `role: ${b.role}`);
    (b.structure || []).forEach((el, i) => {
      const ex = (b.example || [])[i] || {};
      if (el.children) {
        out.push(`- ${el.count} x ${el.element}${el.label ? ` "${el.label}"` : ""}:`);
        const card = (ex.items || [])[0] || [];
        el.children.forEach((c, j) => out.push(leaf(c, card[j], "  ")));
      } else out.push(leaf(el, ex, ""));
    });
    if ((b.techniques || []).length) out.push("techniques:", ...b.techniques.map((x) => `- ${x}`));
    if (b.tone) out.push(`tone: ${tone(b.tone)}`);
    if ((b.avoids || []).length) out.push(`avoid: ${b.avoids.join("; ")}`);
  }
  return `${out.join("\n")}\n`;
}

/** The draft analysis.md: the page fields to fill and one header per candidate, with a guessed type. */
export function draftCompact(page, guessType, language = "en") {
  const out = [`language: ${language}`, "example_product: ", "page_type: ", "audience: ", "awareness: comparing_solutions", "tone: ", "promise: {product} gives {audience} {main_benefit} without {pain}.", "logic: ", "threads:", "- "];
  page.blocks.forEach((b, i) => {
    const type = guessType(b, i, page.blocks.length);
    out.push("", `## p${String(i + 1).padStart(2, "0")} ${type} | | ${b.id}`, "role: ", "techniques:", "- ", "tone: ", "avoid: ");
  });
  return `${out.join("\n")}\n`;
}

export { countWords, countChars };
