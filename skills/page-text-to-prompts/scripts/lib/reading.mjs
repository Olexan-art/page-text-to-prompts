// Step 1 of the skill: read one page in three layers and cut it into candidate blocks.

import { fetchPublicPage } from "./fetchPage.mjs";
import { judgeRequestedUrl } from "./guards.mjs";
import { declaredLanguagesFromHtml, judgeLanguage } from "./language.mjs";
import { REFUSAL_CODE } from "./refusal.mjs";
import { judgeRussianSite } from "./russianSite.mjs";
import { compactKey, looksLikeChallenge, pageFields, sourceKey, staticUnits } from "./staticLayer.mjs";
import { asExpression, collectUnits, expandDisclosures, scrollThrough } from "./collect.mjs";
import { findBrowser, loadAndSettle, openBrowser } from "./browser.mjs";
import { a11yOnlyNames, classifyUnits, segment, visibilitySummary } from "./layers.mjs";
import { VERSION } from "./version.mjs";

const SCHEMA = "page-text-to-prompts/page@1";

/** Render the page and read its accessibility tree. Returns { ok, units, sections, a11yKey, a11yNames, finalUrl, browser } or { ok:false, reason }. */
export async function renderLayers(url, { browserPath = findBrowser() } = {}) {
  let handle;
  try {
    handle = await openBrowser(browserPath);
  } catch (error) {
    return { ok: false, reason: error.reason || "launch_failed" };
  }
  const { session } = handle;
  try {
    const finalUrl = await loadAndSettle(session, url);
    await session.evaluate(asExpression(scrollThrough), 60_000);
    const opened = await session.evaluate(asExpression(expandDisclosures), 30_000);
    const collected = await session.evaluate(asExpression(collectUnits), 60_000);

    await session.send("Accessibility.enable");
    const { nodes } = await session.send("Accessibility.getFullAXTree", {}, 60_000);
    const names = [];
    const corpus = [];
    for (const node of nodes) {
      if (node.ignored) continue;
      const name = node.name?.value;
      if (!name || typeof name !== "string") continue;
      corpus.push(name);
      const role = node.role?.value;
      if (role && !["StaticText", "InlineTextBox", "RootWebArea", "generic", "paragraph", "LineBreak"].includes(role)) names.push(name);
    }
    return {
      ok: true,
      browser: handle.browser,
      finalUrl,
      opened,
      units: collected.units,
      sections: collected.sections,
      a11yKey: corpus.map(compactKey).join(""),
      a11yNames: names,
    };
  } catch (error) {
    return { ok: false, reason: "render_failed", detail: error.message };
  } finally {
    await handle.close();
  }
}

/**
 * The whole reading. `input` is { url } or { html, url? } (a saved file).
 * Returns { ok: true, page } or { ok: false, reasonCode, status?, refusal? }.
 */
export async function readPage(input, { render = true, browserPath } = {}) {
  const fromFile = typeof input.html === "string";
  let url = input.url || null;
  let hosting;

  if (!fromFile) {
    const judged = judgeRequestedUrl(url);
    if (!judged.ok) return { ok: false, reasonCode: judged.reason };
    url = judged.url;
    const before = await judgeRussianSite({ url });
    if (before.refusal) return { ok: false, reasonCode: before.refusal.reasonCode, refusal: before.refusal };
    hosting = before.hosting;
  }

  let html;
  let finalUrl = url;
  let contentLanguage = null;
  if (fromFile) {
    html = input.html;
  } else {
    const fetched = await fetchPublicPage(url);
    if (!fetched.ok) return { ok: false, reasonCode: fetched.reason === "blocked" ? "http_error" : fetched.reason, status: fetched.status };
    html = fetched.html;
    finalUrl = fetched.url;
    contentLanguage = fetched.contentLanguage;
    const after = await judgeRussianSite({ url, finalUrl, html, contentLanguage, hosting });
    if (after.refusal) return { ok: false, reasonCode: after.refusal.reasonCode, refusal: after.refusal };
  }
  if (looksLikeChallenge(html)) return { ok: false, reasonCode: "challenge" };

  const fields = pageFields(html, finalUrl);
  const srcKey = sourceKey(html);

  let rendered = { ok: false, reason: fromFile ? "saved_file" : "not_requested" };
  if (render && !fromFile) rendered = await renderLayers(finalUrl, { browserPath });

  let units;
  let sections;
  let a11yKey = null;
  let a11yNames = [];
  if (rendered.ok) {
    ({ units, sections, a11yKey, a11yNames } = rendered);
  } else {
    ({ units, sections } = staticUnits(html));
  }
  const classified = classifyUnits(units, { sourceKey: srcKey, a11yKey });

  const language = judgeLanguage({ declared: declaredLanguagesFromHtml(html, contentLanguage), text: classified.map((u) => u.text).join(" ") });
  if (language.russian) return { ok: false, reasonCode: REFUSAL_CODE, refusal: { reasonCode: REFUSAL_CODE, signal: "language" } };

  const { blocks, excluded } = segment(classified, sections);
  if (!blocks.length) return { ok: false, reasonCode: "empty" };
  const a11yOnly = rendered.ok ? a11yOnlyNames(a11yNames, classified) : [];

  return {
    ok: true,
    page: {
      schema: SCHEMA,
      tool: { name: "page-text-to-prompts", version: VERSION },
      generatedAt: new Date().toISOString(),
      page: {
        requestedUrl: input.url || null,
        ...fields,
        url: rendered.ok ? rendered.finalUrl : finalUrl,
        rendered: rendered.ok,
        ...(rendered.ok ? { browser: rendered.browser.split(/[\\/]/).pop(), disclosuresOpened: rendered.opened } : { renderReason: rendered.reason }),
        layers: rendered.ok ? ["html", "render", "a11y"] : ["html"],
      },
      visibility: visibilitySummary(classified, blocks, a11yOnly),
      blocks,
      excluded,
    },
  };
}
