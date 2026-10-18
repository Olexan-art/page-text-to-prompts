// Text helpers shared by the reading and the build: one definition of a word, one of a match key.

/** Whitespace folded to single spaces, trimmed. */
export const normalize = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

/** A comparison key: lower case, letters and digits only, single spaces. */
export const matchKey = (value) =>
  normalize(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Words: whitespace-separated tokens holding at least one letter or digit. "·" and "—" are not words. */
export function countWords(value) {
  const tokens = normalize(value).split(" ");
  let n = 0;
  for (const token of tokens) if (/[\p{L}\p{N}]/u.test(token)) n += 1;
  return n;
}

/** Characters as a reader sees them: whitespace folded, then the string length in code points. */
export const countChars = (value) => [...normalize(value)].length;

/** The word sequence used for shingles: match-key tokens. */
export const keyTokens = (value) => matchKey(value).split(" ").filter(Boolean);

/** Every run of `size` consecutive key tokens, joined by a space. */
export function shingles(value, size) {
  const tokens = keyTokens(value);
  const out = [];
  for (let i = 0; i + size <= tokens.length; i += 1) out.push(tokens.slice(i, i + size).join(" "));
  return out;
}

/** True when a range [min, max] is two finite non-negative numbers in order. */
export const isRange = (r) => Array.isArray(r) && r.length === 2 && r.every((n) => Number.isFinite(n) && n >= 0) && r[0] <= r[1];

/** "in" inside the range, "near" within 20% of it, "out" otherwise. */
export function rangeVerdict(value, [min, max], tolerance = 0.2) {
  if (value >= min && value <= max) return "in";
  if (value >= min * (1 - tolerance) && value <= max * (1 + tolerance)) return "near";
  return "out";
}

/** HTML-escape for text and attribute values. */
export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
