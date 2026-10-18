// page-prompts.md (for people) and page-prompts.json (for agents).

import { COPY, plural, reportLang } from "./copy.mjs";
import { measureBlock } from "./measure.mjs";
import { VERSION } from "./version.mjs";

export const EXPORT_SCHEMA = "page-text-to-prompts/prompts@1";

export function buildJson({ page, analysis }) {
  return {
    schema: EXPORT_SCHEMA,
    tool: { name: "page-text-to-prompts", version: VERSION },
    source_url: page.page.url,
    analyzed_at: new Date().toISOString().slice(0, 10),
    language: analysis.language,
    example_product: analysis.example_product,
    layers: page.page.layers,
    visibility: page.visibility,
    page_profile: analysis.profile,
    variables: analysis.variables,
    blocks: analysis.blocks.map((b, i) => {
      const { leaves } = measureBlock(b);
      return {
        order: i + 1,
        ...b,
        example_measured: leaves.map((l) => ({ element: l.path.replace(`${b.id} › `, ""), words: l.m.words, chars: l.m.chars, verdict: l.m.verdict })),
      };
    }),
  };
}

export function buildMarkdown({ page, analysis }) {
  const lang = reportLang(analysis.language);
  const L = COPY[lang];
  const rng = (r, forms) => `${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`} ${plural(r[1], forms, lang)}`;
  const host = (() => {
    try {
      return new URL(page.page.url).hostname;
    } catch {
      return page.page.title || "page";
    }
  })();
  const p = analysis.profile;
  const out = [];
  out.push(`# ${host}`);
  out.push("");
  out.push(`${page.page.url || ""} · ${new Date().toISOString().slice(0, 10)} · ${analysis.blocks.length} ${L.blocks} · page-text-to-prompts ${VERSION}`);
  out.push("");
  out.push(`## ${L.profile}`);
  out.push("");
  out.push(`- **${L.pType}:** ${p.page_type}. ${p.audience}`);
  out.push(`- **${L.pAware}:** ${L.aware[p.awareness] || p.awareness}`);
  if (p.tone) out.push(`- **${L.pTone}:** ${(p.tone.adjectives || []).join(", ")}${p.tone.address ? `; ${p.tone.address}` : ""}`);
  out.push(`- **${L.pPromise}:** ${p.main_promise}`);
  out.push(`- **${L.pLogic}:** ${p.persuasion_logic}`);
  out.push("");
  out.push(`**${L.skeleton}:** ${p.skeleton.join(" → ")}`);
  if ((p.threads || []).length) {
    out.push("");
    out.push(`**${L.pThreads}:**`);
    for (const t of p.threads) out.push(`- ${t}`);
  }
  out.push("");
  out.push(`## ${L.vars}`);
  out.push("");
  out.push(`| ${L.vName} | ${L.vMeans} | ${L.vFact} |`);
  out.push("|---|---|---|");
  for (const [name, v] of Object.entries(analysis.variables || {})) out.push(`| \`{${name}}\` | ${v.means} | ${v.fact ? L.fact : ""} |`);
  out.push("");
  out.push(`## ${L.blocksTitle}`);
  analysis.blocks.forEach((b, i) => {
    out.push("");
    out.push(`### ${String(i + 1).padStart(2, "0")}. ${b.name} · \`${b.block_type}\``);
    out.push("");
    out.push(`**${L.job}:** ${b.role}`);
    out.push("");
    out.push(`**${L.structure}:**`);
    for (const e of b.structure) {
      if (e.children) {
        out.push(`- ${e.count} × ${e.label || e.element}:`);
        for (const c of e.children) out.push(`  - ${c.label || c.element}: ${rng(c.words, L.w)}, ${rng(c.chars, L.c)}${c.must ? `; ${c.must}` : ""}`);
      } else {
        out.push(`- ${e.label || e.element}: ${rng(e.words, L.w)}, ${rng(e.chars, L.c)}${e.must ? `; ${e.must}` : ""}`);
      }
    }
    out.push("");
    out.push(`**${L.techniques}:**`);
    for (const t of b.techniques) out.push(`- ${t}`);
    out.push("");
    out.push(`**${L.prompt}:**`);
    out.push("");
    out.push("```");
    out.push(b.prompt);
    out.push("```");
    if (b.filled_prompt) {
      out.push("");
      out.push(`**${L.filled}:**`);
      out.push("");
      out.push("```");
      out.push(b.filled_prompt);
      out.push("```");
    }
  });
  out.push("");
  return out.join("\n");
}
