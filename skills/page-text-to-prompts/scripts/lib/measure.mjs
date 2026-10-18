// Measuring an example against the structure it was written for.

import { countChars, countWords, rangeVerdict } from "./text.mjs";

/** Worst of a list of verdicts: out > near > in. */
const worst = (verdicts) => (verdicts.includes("out") ? "out" : verdicts.includes("near") ? "near" : "in");

/**
 * Measure one leaf element. `spec` is a structure element; `value` is the example's text, or for a
 * list element (spec.items) an array of strings. Returns { words, chars, verdict, items? }.
 */
export function measureLeaf(spec, value) {
  if (spec.items) {
    const list = Array.isArray(value) ? value : [];
    const items = list.map((text) => ({ words: countWords(text), chars: countChars(text), verdict: worst([rangeVerdict(countWords(text), spec.words), rangeVerdict(countChars(text), spec.chars)]) }));
    const countVerdict = rangeVerdict(list.length, spec.items, 0);
    return { words: Math.max(0, ...items.map((i) => i.words)), chars: Math.max(0, ...items.map((i) => i.chars)), count: list.length, items, verdict: worst([countVerdict === "in" ? "in" : "out", ...items.map((i) => i.verdict)]) };
  }
  const text = typeof value === "string" ? value : "";
  const words = countWords(text);
  const chars = countChars(text);
  return { words, chars, verdict: text ? worst([rangeVerdict(words, spec.words), rangeVerdict(chars, spec.chars)]) : "out" };
}

/**
 * Walk a block's structure and example side by side. Returns { leaves, problems } where leaves is a
 * flat list of { path, spec, value, m } and problems lists every mismatch in shape or volume.
 */
export function measureBlock(block) {
  const leaves = [];
  const problems = [];
  const structure = Array.isArray(block.structure) ? block.structure : [];
  const example = Array.isArray(block.example) ? block.example : [];
  if (example.length !== structure.length) problems.push(`${block.id}: example has ${example.length} elements, structure has ${structure.length}`);

  structure.forEach((spec, i) => {
    const ex = example[i];
    const label = `${block.id} › ${spec.element}`;
    if (!ex || ex.element !== spec.element) {
      problems.push(`${label}: example element ${i + 1} is "${ex?.element ?? "missing"}", expected "${spec.element}"`);
      return;
    }
    if (Array.isArray(spec.children)) {
      const cards = Array.isArray(ex.items) ? ex.items : [];
      if (cards.length !== spec.count) problems.push(`${label}: ${cards.length} items in the example, the structure says ${spec.count}`);
      cards.forEach((card, ci) => {
        spec.children.forEach((child, j) => {
          const cell = Array.isArray(card) ? card[j] : undefined;
          const childLabel = `${label} ${ci + 1} › ${child.element}`;
          if (!cell || cell.element !== child.element) {
            problems.push(`${childLabel}: missing in the example`);
            return;
          }
          const m = measureLeaf(child, child.items ? cell.list : cell.text);
          leaves.push({ path: childLabel, spec: child, value: child.items ? cell.list : cell.text, m, card: ci });
          if (m.verdict === "out") problems.push(`${childLabel}: ${m.words} words / ${m.chars} chars, outside ${child.words.join("–")} words / ${child.chars.join("–")} chars by more than 20%`);
        });
      });
      return;
    }
    const value = spec.items ? ex.list : ex.text;
    const m = measureLeaf(spec, value);
    leaves.push({ path: label, spec, value, m });
    if (m.verdict === "out") {
      const what = spec.items ? `${m.count} items, longest ${m.words} words` : `${m.words} words / ${m.chars} chars`;
      problems.push(`${label}: ${what}, outside ${spec.words.join("–")} words / ${spec.chars.join("–")} chars by more than 20%`);
    }
  });
  return { leaves, problems };
}
