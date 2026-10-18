// The prompt for a block, assembled from what the agent decided: the structure with its ranges,
// the techniques, the tone and what to avoid. The agent no longer writes it; `block.prompt`, when
// present, still wins, for a prompt the agent wants to word by hand.

import { FACT_VARIABLES } from "./checks.mjs";

const T = {
  en: {
    write: (type) => `Write a ${type} for {product}, aimed at {audience}.`,
    lang: (code) => (code === "en" ? "Write in English." : `Write in the language with the code "${code}".`),
    job: "Job of the block:",
    structure: "Structure:",
    techniques: "Techniques:",
    tone: "Tone:",
    address: "address the reader as",
    avoid: "Avoid:",
    facts: (vars) => `Facts: use ${vars} only if provided. If a value is missing, leave its element out. Never invent numbers, clients, names or guarantees.`,
    words: (r) => `${r[0]}–${r[1]} words`,
    chars: (r) => `${r[0]}–${r[1]} characters`,
    items: (r, w) => `${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`} bullets of ${w[0]}–${w[1]} words`,
    type: { hero: "hero block", social_proof_logos: "social proof line", problem: "problem block", solution: "solution block", features: "features block", benefits: "benefits block", how_it_works: "\"how it works\" block", use_cases: "use cases block", testimonials: "testimonials block", case_study: "case study", stats: "stats block", comparison: "comparison block", pricing: "pricing block", faq: "FAQ block", guarantee: "guarantee block", about: "about block", team: "team block", cta: "closing call to action", lead_form: "lead form block", newsletter: "newsletter block", other: "block" },
  },
  uk: {
    write: (type) => `Напиши ${type} для {product}, орієнтований на {audience}.`,
    lang: () => "Пиши українською.",
    job: "Задача блоку:",
    structure: "Структура:",
    techniques: "Прийоми:",
    tone: "Тон:",
    address: "звертання",
    avoid: "Уникай:",
    facts: (vars) => `Факти: ${vars} використовуй, лише якщо їх надано. Якщо значення немає, прибери його елемент. Не вигадуй цифр, клієнтів, імен і гарантій.`,
    words: (r) => `${r[0]}–${r[1]} слів`,
    chars: (r) => `${r[0]}–${r[1]} символів`,
    items: (r, w) => `${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`} пункти по ${w[0]}–${w[1]} слів`,
    type: { hero: "hero-блок", social_proof_logos: "рядок соціального доказу", problem: "блок про проблему", solution: "блок рішення", features: "блок можливостей", benefits: "блок вигод", how_it_works: "блок «як це працює»", use_cases: "блок сценаріїв", testimonials: "блок відгуків", case_study: "кейс", stats: "блок цифр", comparison: "блок порівняння", pricing: "блок цін", faq: "блок частих запитань", guarantee: "блок гарантії", about: "блок «про нас»", team: "блок команди", cta: "фінальний заклик до дії", lead_form: "блок форми", newsletter: "блок підписки", other: "блок" },
  },
};

const lc = (s) => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** The prompt text for one block in the analysis language. */
export function generatePrompt(block, language) {
  if (typeof block.prompt === "string" && block.prompt.trim()) return block.prompt;
  const L = String(language || "en").toLowerCase().startsWith("uk") ? T.uk : T.en;
  const lines = [`${L.write(L.type[block.block_type] || L.type.other)} ${L.lang(String(language || "en").toLowerCase())}`, "", `${L.job} ${lc(block.role)}`, "", L.structure];
  const facts = new Set();
  const noteFacts = (s) => {
    for (const m of String(s || "").matchAll(/\{([a-z][a-z0-9_]*)\}/g)) if (FACT_VARIABLES.includes(m[1])) facts.add(m[1]);
  };
  const leafLine = (el, indent) => {
    noteFacts(el.must);
    const size = el.items ? L.items(el.items, el.words) : `${L.words(el.words)}, ${L.chars(el.chars)}`;
    return `${indent}- ${el.label || el.element}: ${size}${el.must ? `; ${el.must}` : ""}.`;
  };
  for (const el of block.structure || []) {
    if (el.children) {
      lines.push(`- ${el.count} × ${el.label || el.element}:`);
      for (const c of el.children) lines.push(leafLine(c, "  "));
    } else lines.push(leafLine(el, ""));
  }
  if ((block.techniques || []).length) {
    lines.push("", L.techniques);
    for (const t of block.techniques) {
      noteFacts(t);
      lines.push(`- ${t}`);
    }
  }
  const tone = block.tone || {};
  if ((tone.adjectives || []).length || tone.address) lines.push("", `${L.tone} ${(tone.adjectives || []).join(", ")}${tone.address ? `; ${L.address} ${tone.address}` : ""}.`);
  if ((block.avoids || []).length) lines.push(`${L.avoid} ${block.avoids.join(", ")}.`);
  if (facts.size) lines.push(L.facts([...facts].map((f) => `{${f}}`).join(", ")));
  return lines.join("\n");
}
