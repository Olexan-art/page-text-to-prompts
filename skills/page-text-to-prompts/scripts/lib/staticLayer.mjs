// The html layer: the page source as one plain GET returned it, parsed without running anything.
// It gives the page's own fields (title, description, Open Graph, lang), the text a reader without
// JavaScript gets, and, when no browser is available, the units themselves.

import * as cheerio from "cheerio";
import { matchKey, normalize } from "./text.mjs";

const DROP = "script,style,noscript,template,svg,iframe,canvas,video,audio,object,embed,math,head";
const UNIT = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,figcaption,td,th,summary,label,legend,caption,button,a,small";
const BLOCK_DESC = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,figcaption,td,th,ul,ol,table,section,article,div";

/** The page's own fields. */
export function pageFields(html, url) {
  const $ = cheerio.load(html);
  const meta = (sel) => normalize($(sel).attr("content")) || null;
  return {
    url,
    lang: normalize($("html").attr("lang")) || null,
    title: normalize($("head > title").first().text()) || normalize($("title").first().text()) || null,
    metaDescription: meta('meta[name="description" i]'),
    og: {
      title: meta('meta[property="og:title"]'),
      description: meta('meta[property="og:description"]'),
      siteName: meta('meta[property="og:site_name"]'),
    },
  };
}

/**
 * A compact key: letters and digits only, lower case, no separators at all. Layers disagree about
 * where spaces fall (the source glues inline elements, the layout splits flex children), so text is
 * compared without them.
 */
export const compactKey = (value) => matchKey(value).replace(/ /g, "");

/** The body text of the source, as one compact key, for "is this string in the HTML" tests. */
export function sourceKey(html) {
  const $ = cheerio.load(html);
  $(DROP).remove();
  return compactKey($("body").text());
}

/** Whether a compact haystack contains a piece of text. */
export const keyContains = (haystackKey, text) => {
  const k = compactKey(text);
  return k.length > 0 && haystackKey.includes(k);
};

/**
 * Units from the source alone, for a run with no browser: the same capture rules as the rendered
 * collector, with visibility judged from the markup (hidden, aria-hidden, inline display:none).
 */
export function staticUnits(html) {
  const $ = cheerio.load(html);
  $(DROP).remove();
  const units = [];
  const textLen = (el) => $(el).text().replace(/\s+/g, "").length;
  const kids = (el) => $(el).children().toArray();

  const spineOf = (start) => {
    let el = start;
    for (let i = 0; i < 30; i += 1) {
      const total = textLen(el);
      const big = kids(el).find((c) => textLen(c) >= 0.9 * total);
      if (!big || total === 0) return el;
      el = big;
    }
    return el;
  };
  const body = $("body").get(0);
  if (!body) return { units: [], sections: [] };
  const main = $("main,[role=main]").get(0) || null;
  const mainSpine = main ? spineOf(main) : null;
  const bodySpine = spineOf(body);
  const sectionEls = [];
  const sectionIndex = new Map();
  const contains = (a, b) => {
    for (let e = b; e; e = e.parent) if (e === a) return true;
    return false;
  };
  const sectionFor = (el) => {
    let container = null;
    if (mainSpine && contains(mainSpine, el)) {
      for (let e = el; e && e !== mainSpine; e = e.parent) if (e.parent === mainSpine) container = e;
      container = container || mainSpine;
    } else {
      for (let e = el; e && e !== bodySpine && e !== body; e = e.parent) if (e.parent === bodySpine) container = e;
      // Outside the spine (a header or footer beside <main>): the top-level child of <body> holding it.
      if (!container) for (let e = el; e && e !== body; e = e.parent) if (e.parent === body) container = e;
      container = container || bodySpine;
    }
    if (!sectionIndex.has(container)) {
      sectionIndex.set(container, sectionEls.length);
      sectionEls.push(container);
    }
    return sectionIndex.get(container);
  };

  const hiddenByMarkup = (el) => {
    for (let e = el; e && e.type === "tag"; e = e.parent) {
      const $e = $(e);
      if ($e.attr("hidden") !== undefined || $e.attr("aria-hidden") === "true") return true;
      if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($e.attr("style") || "")) return true;
    }
    return false;
  };
  const collapsedBy = (el) => {
    for (let e = el; e && e.type === "tag"; e = e.parent) {
      if (e.name === "details" && $(e).attr("open") === undefined) return "details";
      if ($(e).attr("role") === "tabpanel") return "tab";
    }
    return null;
  };
  const typeOf = (el, text) => {
    const tag = el.name;
    const cls = $(el).attr("class") || "";
    if (/^h[1-6]$/.test(tag)) return tag;
    if (tag === "button" || $(el).attr("role") === "button") return "button";
    if (tag === "a") return /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(cls) ? "button" : "link";
    if (tag === "blockquote") return "quote";
    if (tag === "small") return "small";
    if (tag === "label" || tag === "legend") return "label";
    if (tag === "li") return "li";
    if (text.split(" ").length <= 6 && /(\d\s?(₴|грн|\$|€|£|zł)|(₴|\$|€|£)\s?\d|\/\s?(міс|mo|month|year|рік))/i.test(text)) return "price";
    return "p";
  };

  // Repeated cards, as in the rendered collector: the nearest ancestor whose parent has 2+ children of the same shape.
  const groupIds = new Map();
  const shape = (e) => `${e.name}|${kids(e).map((c) => c.name).join(",")}`;
  const groupOf = (el) => {
    // Sections side by side are not cards: the search stops below the spine.
    for (let a = el, depth = 0; a && a.parent && a.parent !== body && a.parent !== mainSpine && a.parent !== bodySpine && depth < 6; a = a.parent, depth += 1) {
      const sig = shape(a);
      const siblings = kids(a.parent).filter((c) => shape(c) === sig);
      if (siblings.length >= 2 && kids(a).length > 0) {
        if (!groupIds.has(a.parent)) groupIds.set(a.parent, `g${groupIds.size + 1}`);
        return { group: groupIds.get(a.parent), item: siblings.indexOf(a) };
      }
    }
    return { group: null, item: null };
  };

  const capture = (el) => {
    const text = normalize($(el).text());
    if (!text || !/[\p{L}\p{N}]/u.test(text)) return;
    const collapsed = collapsedBy(el);
    const hidden = hiddenByMarkup(el);
    units.push({ text, type: typeOf(el, text), visible: !hidden && !collapsed, collapsed: hidden ? null : collapsed, overlay: false, ...groupOf(el), sec: sectionFor(el), top: null, height: null });
  };
  const walk = (el) => {
    if (el.type !== "tag") return;
    const isUnit = $(el).is(UNIT);
    const hasBlock = $(el).find(BLOCK_DESC).length > 0;
    if (isUnit && (!hasBlock || /^h[1-6]$/.test(el.name))) return capture(el);
    if (!isUnit && !hasBlock) return capture(el);
    for (const child of el.children || []) {
      if (child.type === "tag") walk(child);
      else if (child.type === "text" && /[\p{L}\p{N}]/u.test(child.data) && normalize(child.data).split(" ").length >= 2) {
        units.push({ text: normalize(child.data), type: "p", visible: !hiddenByMarkup(el), collapsed: null, overlay: false, group: null, item: null, sec: sectionFor(el), top: null, height: null });
      }
    }
  };
  walk(body);

  const sections = sectionEls.map((e, i) => ({
    index: i,
    tag: e.name,
    role: $(e).attr("role") || null,
    label: $(e).attr("aria-label") || null,
    id: $(e).attr("id") || null,
    fullWidth: null,
    top: null,
    height: null,
    inMain: Boolean(main && contains(main, e)),
  }));
  return { units, sections };
}

/** A captcha or bot-check page rather than the page itself. */
export function looksLikeChallenge(html) {
  const $ = cheerio.load(html);
  $(DROP).remove();
  const text = normalize($("body").text());
  return text.length < 1500 && /cf-chl|challenge-platform|captcha|just a moment|attention required|verify you are human|checking your browser/i.test(html);
}
