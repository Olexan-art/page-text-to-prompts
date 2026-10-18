// The three layers compared, and the page cut into candidate blocks.
// Pure: everything here works on the plain objects the collectors return, so it is testable without a browser.

import { countChars, countWords } from "./text.mjs";
import { compactKey, keyContains } from "./staticLayer.mjs";

export const STATUSES = ["ok", "js_only", "collapsed", "not_in_a11y"];
export const MERGE_BELOW_WORDS = 8;
export const SAMPLE_LIMIT = 8;

/**
 * The status of one unit. `inHtml` and `inA11y` are booleans, or null when that layer was not read.
 * ok | js_only | collapsed | not_in_a11y | hidden
 */
export function unitStatus({ visible, collapsed, inHtml, inA11y }) {
  if (!visible) return collapsed ? "collapsed" : "hidden";
  if (inHtml === false) return "js_only";
  if (inA11y === false) return "not_in_a11y";
  return "ok";
}

const isHeading = (u) => /^h[1-6]$/.test(u.type);
const isNumberish = (u) => /\d/.test(u.text) && countWords(u.text) <= 5;

/** Attach status, words and chars to every unit. */
export function classifyUnits(units, { sourceKey, a11yKey }) {
  return units.map((u) => {
    const inHtml = sourceKey == null ? null : keyContains(sourceKey, u.text);
    const inA11y = a11yKey == null ? null : keyContains(a11yKey, u.text);
    return { ...u, words: countWords(u.text), chars: countChars(u.text), inHtml, inA11y, status: unitStatus({ ...u, inHtml, inA11y }) };
  });
}

const LANDMARK_EXCLUDE = { nav: "navigation", navigation: "navigation" };
const COOKIE = /cookie|consent|gdpr|файли cookie|кукі/i;
const LEGAL = /©|copyright|all rights reserved|усі права захищено|всі права захищені/i;

function sectionEvidence(section) {
  if (!section) return [];
  const out = [];
  if (section.role) out.push(`role:${section.role}`);
  if (section.label) out.push(`region "${section.label}"`);
  if (["section", "article", "header", "footer", "aside", "nav", "main", "form"].includes(section.tag)) out.push(`<${section.tag}>`);
  else out.push(`container <${section.tag}>`);
  if (section.fullWidth) out.push("full-width container");
  return out;
}

/**
 * Cut the classified units into candidate blocks.
 * Returns { blocks, excluded }; blocks carry id, evidence, elements; excluded carries reason and a sample.
 */
export function segment(units, sections) {
  const included = units.filter((u) => u.status !== "hidden");
  // 1. By section container.
  const bySection = new Map();
  for (const u of included) {
    if (!bySection.has(u.sec)) bySection.set(u.sec, []);
    bySection.get(u.sec).push(u);
  }
  let raw = [];
  for (const [sec, list] of bySection) {
    const section = sections[sec];
    // 2. Split at h2 when a section holds two or more.
    const h2s = list.filter((u) => u.type === "h2").length;
    if (h2s >= 2) {
      let current = [];
      for (const u of list) {
        if (u.type === "h2" && current.some((x) => x.type === "h2" || countWords(x.text) >= MERGE_BELOW_WORDS)) {
          raw.push({ section, elements: current, split: true });
          current = [];
        }
        current.push(u);
      }
      if (current.length) raw.push({ section, elements: current, split: true });
    } else {
      raw.push({ section, elements: list, split: false });
    }
  }

  // 3. Exclusions: overlays, navigation, cookie banners, copyright lines.
  const excluded = [];
  const kept = [];
  for (const block of raw) {
    const words = block.elements.reduce((n, u) => n + u.words, 0);
    const links = block.elements.filter((u) => u.type === "link");
    const linkWords = links.reduce((n, u) => n + u.words, 0);
    // A menu is many short links; a row of card links is long ones and is content.
    const shortLinks = links.length > 0 && linkWords / links.length <= 4;
    const text = block.elements.map((u) => u.text).join(" ");
    const sample = text.slice(0, 120);
    const tagReason = LANDMARK_EXCLUDE[block.section?.tag] || LANDMARK_EXCLUDE[block.section?.role];
    let reason = null;
    if (block.elements.every((u) => u.overlay)) reason = COOKIE.test(text) ? "cookie_banner" : "overlay";
    else if (tagReason) reason = tagReason;
    else if (words > 0 && linkWords / words > 0.7 && shortLinks) reason = "navigation";
    else if (words < 30 && LEGAL.test(text) && !block.elements.some(isHeading)) reason = "legal";
    else if ((block.section?.tag === "footer" || block.section?.role === "contentinfo") && !block.elements.some((u) => u.type === "h2" || u.type === "button")) reason = "footer";
    else if ((block.section?.tag === "header" || block.section?.role === "banner") && !block.section?.inMain && !block.elements.some((u) => u.type === "h1" || u.type === "button")) reason = "header";
    if (reason) excluded.push({ reason, words, elements: block.elements.length, sample });
    else kept.push({ ...block, elements: block.elements.filter((u) => !u.overlay), overlays: block.elements.filter((u) => u.overlay) });
  }
  for (const block of kept) {
    if (block.overlays.length) {
      const text = block.overlays.map((u) => u.text).join(" ");
      excluded.push({ reason: COOKIE.test(text) ? "cookie_banner" : "overlay", words: block.overlays.reduce((n, u) => n + u.words, 0), elements: block.overlays.length, sample: text.slice(0, 120) });
    }
  }

  // 4. Merge small candidates: an eyebrow joins the block below, anything else the block above.
  const blocks = kept.filter((b) => b.elements.length);
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    const words = b.elements.reduce((n, u) => n + u.words, 0);
    const protectedBlock = b.elements.some((u) => u.type === "button") || (b.elements.length >= 2 && b.elements.every(isNumberish));
    if (words >= MERGE_BELOW_WORDS || protectedBlock || blocks.length === 1) continue;
    const next = blocks[i + 1];
    const prev = blocks[i - 1];
    const intoNext = next && isHeading(next.elements[0]) && !b.elements.some(isHeading);
    const target = intoNext ? next : prev || next;
    if (!target) continue;
    if (target === next) target.elements = [...b.elements, ...target.elements];
    else target.elements = [...target.elements, ...b.elements];
    target.merged = (target.merged || 0) + 1;
    blocks.splice(i, 1);
    i -= 1;
  }

  const out = blocks.map((b, i) => {
    const evidence = sectionEvidence(b.section);
    if (b.split) evidence.push("h2 split");
    if (b.merged) evidence.push(`${b.merged} small candidate(s) merged in`);
    const statusWords = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const u of b.elements) statusWords[u.status] += u.words;
    return {
      id: `b${String(i + 1).padStart(2, "0")}`,
      evidence,
      words: b.elements.reduce((n, u) => n + u.words, 0),
      statusWords,
      elements: b.elements.map((u) => ({
        type: u.type,
        text: u.text,
        words: u.words,
        chars: u.chars,
        group: u.group,
        item: u.item,
        status: u.status,
      })),
    };
  });
  return { blocks: out, excluded };
}

/** The visibility summary over the blocks, plus what never reached them. */
export function visibilitySummary(units, blocks, a11yOnly) {
  const words = Object.fromEntries(STATUSES.map((s) => [s, 0]));
  for (const b of blocks) for (const e of b.elements) words[e.status] += e.words;
  const total = STATUSES.reduce((n, s) => n + words[s], 0);
  const hidden = units.filter((u) => u.status === "hidden");
  return {
    words,
    totalWords: total,
    jsOnlyShare: total ? words.js_only / total : 0,
    collapsedShare: total ? words.collapsed / total : 0,
    hidden: { count: hidden.length, samples: hidden.slice(0, SAMPLE_LIMIT).map((u) => u.text.slice(0, 100)) },
    a11yOnly: { count: a11yOnly.length, samples: a11yOnly.slice(0, SAMPLE_LIMIT) },
  };
}

/** Names from the accessibility tree that no visible or collapsed unit carries: aria-labels and screen-reader text. */
export function a11yOnlyNames(a11yNames, units) {
  const seen = units.filter((u) => u.status !== "hidden").map((u) => compactKey(u.text)).join("");
  const out = [];
  const dedupe = new Set();
  for (const name of a11yNames) {
    const k = compactKey(name);
    if (countWords(name) < 2 || dedupe.has(k) || seen.includes(k)) continue;
    dedupe.add(k);
    out.push(name.slice(0, 100));
  }
  return out;
}
