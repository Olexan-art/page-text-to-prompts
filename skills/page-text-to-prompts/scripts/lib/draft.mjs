// Everything about an analysis a script can decide, written out so the agent only fills in words:
// one block per candidate, a guessed block type, the structure with ranges measured from the page,
// card groups with their counts, the canonical variables, and an empty example to write into.
// Also the brief: the page's text as plain lines, much shorter than page.json, for the agent to read.

const CODE = { h1: "h1", h2: "h2", h3: "h3", h4: "h3", h5: "h3", h6: "h3", p: "text", li: "item", button: "button", link: "link", price: "price", quote: "quote", small: "small", label: "label" };
const CANONICAL = {
  product: ["the product's name and what it is, in a few words", false],
  audience: ["who reads the page: role and situation", false],
  main_benefit: ["the main result the reader gets", false],
  pain: ["the reader's main problem", false],
  cta_action: ["the action the button asks for", false],
  risk_remover: ["what makes the first step safe", true],
  customer_count: ["how many customers", true],
  testimonial_n: ["a real quote with name and role", true],
  plan_n: ["a plan's name, price and contents", true],
};

/** A range around a measured value: 20% either side, at least one unit wide. */
function around(lo, hi = lo) {
  const min = Math.max(1, Math.floor(lo * 0.8));
  const max = Math.max(min + 1, Math.ceil(hi * 1.2));
  return [min, max];
}

const leaf = (code, els) => {
  const words = els.map((e) => e.words);
  const chars = els.map((e) => e.chars);
  return { element: code, words: around(Math.min(...words), Math.max(...words)), chars: around(Math.min(...chars), Math.max(...chars)), must: "" };
};

/** Unique codes within one level: text, text_2, text_3. */
function uniquify(list) {
  const seen = {};
  for (const el of list) {
    seen[el.element] = (seen[el.element] || 0) + 1;
    if (seen[el.element] > 1) el.element = `${el.element}_${seen[el.element]}`;
  }
  return list;
}

/** The structure of one candidate block, measured from its elements. */
export function deriveStructure(elements) {
  const out = [];
  let i = 0;
  while (i < elements.length) {
    const e = elements[i];
    if (e.group) {
      // A run of one card group: children from the first card, ranges across all cards.
      const run = [];
      while (i < elements.length && elements[i].group === e.group) run.push(elements[i++]);
      const items = [...new Set(run.map((x) => x.item))];
      const first = run.filter((x) => x.item === items[0]);
      const children = [];
      let j = 0;
      while (j < first.length) {
        const code = CODE[first[j].type] || "text";
        if (first[j].type === "li") {
          // A list inside the card: one leaf with an item count.
          const k = j;
          while (j < first.length && first[j].type === "li") j += 1;
          const lis = run.filter((x) => x.type === "li");
          const perCard = first.slice(k, j).length;
          children.push({ ...leaf("items", lis), items: [perCard, perCard] });
          continue;
        }
        const same = run.filter((x) => (CODE[x.type] || "text") === code);
        children.push(leaf(code, same.length ? same : [first[j]]));
        j += 1;
      }
      out.push({ element: "cards", count: items.length, children: uniquify(children) });
      continue;
    }
    if (e.type === "li") {
      const run = [];
      while (i < elements.length && elements[i].type === "li" && !elements[i].group) run.push(elements[i++]);
      out.push({ ...leaf("items", run), items: [run.length, run.length] });
      continue;
    }
    out.push(leaf(CODE[e.type] || "text", [e]));
    i += 1;
  }
  return uniquify(out);
}

/** A first guess at the block type, for the agent to confirm or change. */
export function guessType(block, index, total) {
  const types = block.elements.map((e) => e.type);
  const text = block.elements.map((e) => e.text).join(" ");
  if (types.includes("h1")) return "hero";
  if (types.filter((t) => t === "price").length >= 2) return "pricing";
  if (types.filter((t) => t === "quote").length >= 2) return "testimonials";
  if (block.statusWords?.collapsed > block.words / 3 || (text.match(/\?/g) || []).length >= 3) return "faq";
  if (block.elements.filter((e) => /\d/.test(e.text) && e.words <= 4).length >= 3) return "stats";
  if (index === total - 1 && types.includes("button")) return "cta";
  if (types.filter((t) => t === "li").length >= 4 && block.elements.every((e) => e.words <= 12)) return "social_proof_logos";
  return "other";
}

/** An empty example mirroring a structure. */
function emptyExample(structure) {
  return structure.map((el) => {
    if (el.children) return { element: el.element, items: Array.from({ length: el.count }, () => el.children.map((c) => (c.items ? { element: c.element, list: Array(c.items[0]).fill("") } : { element: c.element, text: "" }))) };
    return el.items ? { element: el.element, list: Array(el.items[0]).fill("") } : { element: el.element, text: "" };
  });
}

export function buildDraft(page, language = "en") {
  const total = page.blocks.length;
  return {
    language,
    example_product: "",
    profile: { page_type: "", audience: "", awareness: "comparing_solutions", tone: { adjectives: [], formality: 2, address: "" }, main_promise: "{product} gives {audience} {main_benefit} without {pain}.", skeleton: [], persuasion_logic: "", threads: [] },
    variables: Object.fromEntries(Object.entries(CANONICAL).map(([k, [means, fact]]) => [k, { means, fact }])),
    dropped: [],
    blocks: page.blocks.map((b, i) => {
      const structure = deriveStructure(b.elements);
      return {
        id: `p${String(i + 1).padStart(2, "0")}`,
        source_blocks: [b.id],
        block_type: guessType(b, i, total),
        name: "",
        role: "",
        structure,
        techniques: [],
        tone: { adjectives: [], formality: 2, address: "" },
        avoids: [],
        example: emptyExample(structure),
      };
    }),
  };
}

/** The page's text for the agent: one line per element, grouped by candidate, no JSON around it. */
export function buildBrief(page) {
  const v = page.visibility;
  const pct = (x) => `${Math.round(x * 100)}%`;
  const lines = [];
  lines.push(`# ${page.page.title || page.page.url}`);
  lines.push(`${page.page.url} · lang ${page.page.lang || "?"} · layers ${page.page.layers.join("+")} · ${v.totalWords} words · js_only ${pct(v.jsOnlyShare)} · collapsed ${pct(v.collapsedShare)}`);
  if (page.page.metaDescription) lines.push(`meta: ${page.page.metaDescription}`);
  lines.push("");
  for (const b of page.blocks) {
    lines.push(`## ${b.id} · ${b.words} words${b.statusWords.collapsed ? ` · ${b.statusWords.collapsed} collapsed` : ""}${b.statusWords.js_only ? ` · ${b.statusWords.js_only} js_only` : ""}`);
    for (const e of b.elements) {
      const card = e.group ? ` [${e.group}#${e.item + 1}]` : "";
      const flag = e.status === "ok" ? "" : ` (${e.status})`;
      lines.push(`- ${e.type} ${e.words}w${card}${flag}: ${e.text.length > 400 ? `${e.text.slice(0, 400)}…` : e.text}`);
    }
    lines.push("");
  }
  if (page.excluded.length) lines.push(`Excluded: ${page.excluded.map((e) => `${e.reason} (${e.words} words)`).join(", ")}`);
  return lines.join("\n");
}
