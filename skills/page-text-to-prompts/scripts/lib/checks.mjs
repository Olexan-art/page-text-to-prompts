// Step 3's gate: everything the agent wrote is checked here before any file is written.
// Each check returns a list of problems; an empty list everywhere means the result may be built.

import { measureBlock } from "./measure.mjs";
import { isRange, keyTokens, shingles } from "./text.mjs";

export const BLOCK_TYPES = [
  "hero", "social_proof_logos", "problem", "solution", "features", "benefits", "how_it_works", "use_cases",
  "testimonials", "case_study", "stats", "comparison", "pricing", "faq", "guarantee", "about", "team", "cta",
  "lead_form", "newsletter", "other",
];
export const AWARENESS = ["unaware", "problem_aware", "comparing_solutions", "product_aware", "ready_to_buy"];
/** Canonical variables that stand for facts: declaring one without fact:true is refused. */
export const FACT_VARIABLES = ["risk_remover", "outcome_number", "customer_count", "customer_n", "testimonial_n", "plan_n", "guarantee", "deadline"];
export const SHINGLE = 6;
export const CHECK_IDS = ["overlap", "brand", "volume", "variables", "example", "blocks"];

const VAR = /\{([a-z][a-z0-9_]*)\}/g;
const str = (v) => typeof v === "string" && v.trim().length > 0;

/** Every leaf of a structure, children included. */
function leavesOf(structure) {
  const out = [];
  for (const el of structure || []) {
    if (Array.isArray(el.children)) for (const c of el.children) out.push(c);
    else out.push(el);
  }
  return out;
}

/** Every string the result will publish, with where it sits, for the overlap and brand checks. */
export function outputStrings(analysis) {
  const out = [];
  const push = (where, v) => {
    if (str(v)) out.push({ where, text: v });
  };
  const p = analysis.profile || {};
  push("profile.audience", p.audience);
  push("profile.main_promise", p.main_promise);
  push("profile.persuasion_logic", p.persuasion_logic);
  (p.threads || []).forEach((t, i) => push(`profile.threads[${i}]`, t));
  for (const b of analysis.blocks || []) {
    push(`${b.id}.name`, b.name);
    push(`${b.id}.role`, b.role);
    push(`${b.id}.prompt`, b.prompt);
    push(`${b.id}.filled_prompt`, b.filled_prompt);
    (b.techniques || []).forEach((t, i) => push(`${b.id}.techniques[${i}]`, t));
    (b.avoids || []).forEach((t, i) => push(`${b.id}.avoids[${i}]`, t));
    for (const leaf of leavesOf(b.structure)) push(`${b.id}.${leaf.element}.must`, leaf.must);
    for (const ex of b.example || []) {
      push(`${b.id}.example.${ex.element}`, ex.text);
      (ex.list || []).forEach((t) => push(`${b.id}.example.${ex.element}`, t));
      for (const card of ex.items || []) for (const cell of card || []) {
        push(`${b.id}.example.${ex.element}.${cell?.element}`, cell?.text);
        (cell?.list || []).forEach((t) => push(`${b.id}.example.${ex.element}.${cell?.element}`, t));
      }
    }
  }
  return out;
}

/** The page's own text, for the overlap check: every element of every candidate, and the page fields. */
export function pageTexts(page) {
  const texts = [];
  for (const b of page.blocks || []) for (const e of b.elements || []) texts.push(e.text);
  const f = page.page || {};
  for (const v of [f.title, f.metaDescription, f.og?.title, f.og?.description]) if (str(v)) texts.push(v);
  return texts;
}

/** Brand words: the site's name from the domain and og:site_name. */
export function brandTerms(page) {
  const terms = new Set();
  try {
    const host = new URL(page.page.url || page.page.requestedUrl).hostname.replace(/^www\./, "");
    const labels = host.split(".");
    const name = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
    if (name && name.length >= 3) terms.add(name.toLowerCase());
  } catch {
    // a saved file with no URL has no domain
  }
  const site = page.page?.og?.siteName;
  if (str(site) && site.length >= 3) terms.add(keyTokens(site).join(" "));
  return [...terms].filter(Boolean);
}

export function checkSchema(analysis) {
  const p = [];
  if (!str(analysis.language)) p.push("language: missing (an ISO code such as uk or en)");
  if (!str(analysis.example_product)) p.push("example_product: missing");
  const prof = analysis.profile || {};
  for (const k of ["page_type", "audience", "main_promise", "persuasion_logic"]) if (!str(prof[k])) p.push(`profile.${k}: missing`);
  if (!AWARENESS.includes(prof.awareness)) p.push(`profile.awareness: one of ${AWARENESS.join(", ")}`);
  if (!Array.isArray(prof.skeleton) || !prof.skeleton.length) p.push("profile.skeleton: missing");
  if (!Array.isArray(analysis.blocks) || !analysis.blocks.length) p.push("blocks: missing");
  for (const b of analysis.blocks || []) {
    const id = b.id || "(block without id)";
    if (!str(b.id)) p.push("a block has no id");
    if (!BLOCK_TYPES.includes(b.block_type)) p.push(`${id}.block_type: "${b.block_type}" is not one of the listed types (use "other" with block_type_reason)`);
    if (b.block_type === "other" && !str(b.block_type_reason)) p.push(`${id}.block_type_reason: needed for "other"`);
    for (const k of ["name", "role", "prompt"]) if (!str(b[k])) p.push(`${id}.${k}: missing`);
    if (!Array.isArray(b.structure) || !b.structure.length) p.push(`${id}.structure: missing`);
    if (!Array.isArray(b.techniques) || !b.techniques.length) p.push(`${id}.techniques: missing`);
  }
  return p;
}

/** volume: every leaf has a word range and a character range; groups have a count. */
export function checkVolume(analysis) {
  const p = [];
  for (const b of analysis.blocks || []) {
    for (const el of b.structure || []) {
      if (Array.isArray(el.children)) {
        if (!Number.isInteger(el.count) || el.count < 1) p.push(`${b.id} › ${el.element}: a group needs a count`);
        for (const c of el.children) {
          if (!isRange(c.words) || !isRange(c.chars)) p.push(`${b.id} › ${el.element} › ${c.element}: words and chars must both be [min, max]`);
          if (c.items && !isRange(c.items)) p.push(`${b.id} › ${el.element} › ${c.element}: items must be [min, max]`);
        }
      } else {
        if (!isRange(el.words) || !isRange(el.chars)) p.push(`${b.id} › ${el.element}: words and chars must both be [min, max]`);
        if (el.items && !isRange(el.items)) p.push(`${b.id} › ${el.element}: items must be [min, max]`);
      }
    }
  }
  return p;
}

/** variables: every {name} used is declared; canonical facts are declared as facts. */
export function checkVariables(analysis) {
  const p = [];
  const declared = analysis.variables || {};
  const used = new Map();
  const scan = (where, text) => {
    if (!str(text)) return;
    for (const m of text.matchAll(VAR)) if (!used.has(m[1])) used.set(m[1], where);
  };
  scan("profile.main_promise", analysis.profile?.main_promise);
  for (const b of analysis.blocks || []) {
    scan(`${b.id}.prompt`, b.prompt);
    for (const t of b.techniques || []) scan(`${b.id}.techniques`, t);
    for (const leaf of leavesOf(b.structure)) scan(`${b.id}.${leaf.element}.must`, leaf.must);
  }
  for (const [name, where] of used) {
    if (!declared[name]) p.push(`{${name}} is used in ${where} but not declared in variables`);
  }
  for (const [name, v] of Object.entries(declared)) {
    if (!str(v?.means)) p.push(`variables.${name}.means: missing`);
    if (FACT_VARIABLES.includes(name) && v?.fact !== true) p.push(`variables.${name}: stands for a fact, so it needs "fact": true`);
  }
  return p;
}

/** example: the example mirrors the structure and stays within 20% of every range. */
export function checkExamples(analysis) {
  return (analysis.blocks || []).flatMap((b) => measureBlock(b).problems);
}

/** blocks: every candidate is used once or dropped with a reason; no unknown ids. */
export function checkBlocks(analysis, page) {
  const p = [];
  const known = new Set((page.blocks || []).map((b) => b.id));
  const seen = new Map();
  const note = (id, where) => {
    if (!known.has(id)) p.push(`${where}: "${id}" is not a candidate in page.json`);
    else if (seen.has(id)) p.push(`"${id}" is used twice (${seen.get(id)} and ${where})`);
    else seen.set(id, where);
  };
  for (const b of analysis.blocks || []) {
    if (!Array.isArray(b.source_blocks) || !b.source_blocks.length) p.push(`${b.id}.source_blocks: missing`);
    for (const id of b.source_blocks || []) note(id, `${b.id}.source_blocks`);
  }
  for (const d of analysis.dropped || []) {
    if (!str(d.reason)) p.push(`dropped "${d.id}": needs a reason`);
    note(d.id, "dropped");
  }
  for (const id of known) if (!seen.has(id)) p.push(`candidate "${id}" is neither in a block nor dropped`);
  return p;
}

/** overlap: no output string shares a run of 6 words with the page. */
export function checkOverlap(analysis, page) {
  const pageSet = new Set(pageTexts(page).flatMap((t) => shingles(t, SHINGLE)));
  const p = [];
  for (const { where, text } of outputStrings(analysis)) {
    const hit = shingles(text, SHINGLE).find((s) => pageSet.has(s));
    if (hit) p.push(`${where}: repeats the page ("${hit}")`);
  }
  return p;
}

/** brand: the site's name appears nowhere in the output. */
export function checkBrand(analysis, page) {
  const terms = brandTerms(page);
  const p = [];
  if (!terms.length) return p;
  for (const { where, text } of outputStrings(analysis)) {
    const key = ` ${keyTokens(text).join(" ")} `;
    const compact = keyTokens(text).join("");
    for (const term of terms) {
      if (key.includes(` ${term} `) || (term.length >= 6 && !term.includes(" ") && compact.includes(term))) p.push(`${where}: names the brand ("${term}")`);
    }
  }
  return p;
}

/** All checks. Returns { ok, results: { id: problems[] }, schema: problems[] }. */
export function runChecks(analysis, page) {
  const schema = checkSchema(analysis);
  const volume = checkVolume(analysis);
  const results = {
    overlap: checkOverlap(analysis, page),
    brand: checkBrand(analysis, page),
    volume,
    variables: checkVariables(analysis),
    // An example can only be measured against ranges that exist.
    example: schema.length || volume.length ? [] : checkExamples(analysis),
    blocks: checkBlocks(analysis, page),
  };
  const ok = !schema.length && Object.values(results).every((list) => !list.length);
  return { ok, schema, results };
}
