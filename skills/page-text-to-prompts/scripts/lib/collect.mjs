// The scripts that run inside the rendered page. Each is a self-contained function serialised with
// toString(), so nothing here may reference a name from outside its own body.

/** Scroll to the bottom in steps so lazy content loads, then back to the top. */
export function scrollThrough() {
  return (async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    let last = -1;
    for (let i = 0; i < 60; i += 1) {
      window.scrollBy(0, 800);
      await pause(300);
      const y = window.scrollY;
      if (y === last) break;
      last = y;
    }
    window.scrollTo(0, 0);
    await pause(500);
    return document.documentElement.scrollHeight;
  })();
}

/**
 * Open what is folded: every <details>, and disclosure buttons (aria-expanded="false") that sit in a
 * FAQ-like region or in a run of three or more. Links to other pages are never clicked.
 */
export function expandDisclosures() {
  return (async () => {
    const pause = (ms) => new Promise((r) => setTimeout(r, ms));
    let opened = 0;
    for (const d of document.querySelectorAll("details:not([open])")) {
      d.open = true;
      opened += 1;
    }
    const FAQ = /faq|question|питан|pregunt|fragen|questions|pytani|питання/i;
    const controls = [...document.querySelectorAll('[aria-expanded="false"]')];
    const byParent = new Map();
    for (const c of controls) {
      const key = c.parentElement?.parentElement || c.parentElement;
      byParent.set(key, (byParent.get(key) || 0) + 1);
    }
    for (const c of controls) {
      const tag = c.tagName;
      const isLink = tag === "A" && c.getAttribute("href") && !c.getAttribute("href").startsWith("#");
      if (isLink) continue;
      const clickable = tag === "BUTTON" || tag === "SUMMARY" || c.getAttribute("role") === "button" || tag === "A";
      if (!clickable) continue;
      const region = c.closest("section,article,div[id],div[class]");
      const faqLike = region && FAQ.test(`${region.id} ${region.className} ${region.querySelector("h1,h2,h3")?.textContent || ""}`);
      const inRun = (byParent.get(c.parentElement?.parentElement || c.parentElement) || 0) >= 3;
      if (!faqLike && !inRun) continue;
      try {
        c.click();
        opened += 1;
        await pause(60);
      } catch {
        // a control that refuses a click stays folded
      }
    }
    await pause(400);
    return opened;
  })();
}

/** Collect every text unit of the page, in document order, with what the layers need. */
export function collectUnits() {
  const VW = window.innerWidth;
  const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "IFRAME", "CANVAS", "VIDEO", "AUDIO", "SELECT", "OPTION", "HEAD", "OBJECT", "EMBED", "MATH"]);
  const UNIT = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,figcaption,td,th,summary,label,legend,caption,button,a,small";
  const BLOCK_DESC = "h1,h2,h3,h4,h5,h6,p,li,blockquote,dt,dd,figcaption,td,th,ul,ol,table,section,article";
  const COLLAPSE_CLASS = /(^|[\s_-])(tab|tabs|slide|slider|carousel|swiper|accordion|collapse|collapsible|faq|toggle|panel|annual|yearly|monthly)([\s_-]|$)/i;
  const controlled = new Set();
  for (const el of document.querySelectorAll("[aria-controls]")) for (const id of el.getAttribute("aria-controls").split(/\s+/)) if (id) controlled.add(id);

  const fixedCache = new Map();
  const isFixed = (el) => {
    const chain = [];
    let found = false;
    for (let e = el; e && e !== document.body && e !== document.documentElement; e = e.parentElement) {
      if (fixedCache.has(e)) {
        found = fixedCache.get(e);
        break;
      }
      chain.push(e);
      if (getComputedStyle(e).position === "fixed") {
        found = true;
        break;
      }
    }
    for (const e of chain) fixedCache.set(e, found);
    return found;
  };

  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return false;
    if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
    if (r.right < -500 || r.left > VW + 500) return false;
    return true;
  };

  const collapsedBy = (el) => {
    for (let e = el, depth = 0; e && e !== document.body && depth < 12; e = e.parentElement, depth += 1) {
      if (e.tagName === "DETAILS" && !e.open) return "details";
      const role = e.getAttribute("role");
      if (role === "tabpanel") return "tab";
      const rd = (e.getAttribute("aria-roledescription") || "").toLowerCase();
      if (rd.includes("slide")) return "slide";
      if (e.id && controlled.has(e.id)) return "disclosure";
      const cls = typeof e.className === "string" ? e.className : "";
      if (COLLAPSE_CLASS.test(cls)) return "panel";
    }
    return null;
  };

  // Repeated cards: the nearest ancestor whose parent has 2+ children of the same shape.
  const groupIds = new WeakMap();
  let nextGroup = 1;
  const shape = (e) => `${e.tagName}|${[...e.children].map((c) => c.tagName).join(",")}`;
  const groupOf = (el) => {
    // Sections side by side are not cards: the search stops below the spine.
    for (let a = el, depth = 0; a && a.parentElement && a.parentElement !== document.body && a.parentElement !== mainSpine && a.parentElement !== bodySpine && depth < 6; a = a.parentElement, depth += 1) {
      const sig = shape(a);
      const siblings = [...a.parentElement.children].filter((c) => shape(c) === sig);
      if (siblings.length >= 2 && a.children.length > 0) {
        let id = groupIds.get(a.parentElement);
        if (!id) {
          id = `g${nextGroup++}`;
          groupIds.set(a.parentElement, id);
        }
        return { group: id, item: siblings.indexOf(a) };
      }
    }
    return { group: null, item: null };
  };

  // The spine: from <main> (or <body>), descend while one child holds 90% of the text.
  const textLen = (e) => (e.textContent || "").replace(/\s+/g, "").length;
  const spineOf = (start) => {
    let el = start;
    for (let i = 0; i < 30; i += 1) {
      const total = textLen(el);
      const kids = [...el.children].filter((c) => !SKIP.has(c.tagName));
      const big = kids.find((c) => textLen(c) >= 0.9 * total);
      if (!big || total === 0) return el;
      el = big;
    }
    return el;
  };
  const main = document.querySelector("main,[role=main]");
  const bodySpine = spineOf(document.body);
  const mainSpine = main ? spineOf(main) : null;
  const sectionEls = [];
  const sectionIndex = new Map();
  const sectionFor = (el) => {
    let container = null;
    if (mainSpine && mainSpine.contains(el)) {
      for (let e = el; e && e !== mainSpine; e = e.parentElement) if (e.parentElement === mainSpine) container = e;
      if (!container) container = mainSpine;
    } else {
      for (let e = el; e && e !== bodySpine && e !== document.body; e = e.parentElement) {
        if (e.parentElement === bodySpine || (main && e.parentElement && e.parentElement.contains(main) && !e.contains(main))) container = e;
      }
      if (!container) for (let e = el; e && e !== document.body; e = e.parentElement) if (e.parentElement === document.body) container = e;
      if (!container) container = bodySpine;
    }
    if (!sectionIndex.has(container)) {
      sectionIndex.set(container, sectionEls.length);
      sectionEls.push(container);
    }
    return sectionIndex.get(container);
  };

  const units = [];
  const typeOf = (el, text) => {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role");
    if (/^h[1-6]$/.test(tag)) return tag;
    if (role === "heading") return `h${Math.min(6, Math.max(1, Number(el.getAttribute("aria-level")) || 2))}`;
    const cls = typeof el.className === "string" ? el.className : "";
    if (tag === "button" || role === "button" || (tag === "input" && /submit|button/.test(el.type))) return "button";
    if (tag === "a") return /(^|[\s_-])(btn|button|cta)([\s_-]|$)/i.test(cls) ? "button" : "link";
    if (tag === "blockquote" || el.closest('blockquote,[class*="testimonial"],[class*="review"],[class*="quote"]')) return "quote";
    if (tag === "small" || /footnote|disclaimer|fine-?print|legal/i.test(cls)) return "small";
    if (tag === "label" || tag === "legend") return "label";
    if (tag === "li") return "li";
    const words = text.split(" ").length;
    if (words <= 6 && /(\d[\d\s.,]*\s?(₴|грн|\$|€|£|zł|uah|usd|eur)|(₴|\$|€|£)\s?\d|\/\s?(міс|mo|month|рік|yr|year|mies))/i.test(text)) return "price";
    return "p";
  };

  const capture = (el) => {
    const vis = visible(el);
    // innerText follows the layout, so flex and block children are kept apart ("Hard rule GetLoopLoop",
    // not "Hard ruleGetLoopLoop"); for a hidden element it falls back to textContent anyway.
    const text = norm(vis ? el.innerText : el.textContent);
    if (!text || !/[\p{L}\p{N}]/u.test(text)) return;
    const r = el.getBoundingClientRect();
    const { group, item } = groupOf(el);
    units.push({
      text,
      type: typeOf(el, text),
      visible: vis,
      collapsed: vis ? null : collapsedBy(el),
      overlay: isFixed(el),
      group,
      item,
      sec: sectionFor(el),
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
    });
  };

  const inlineOnly = (el) => [...el.children].every((c) => c.tagName === "BR" || /^inline/.test(getComputedStyle(c).display));
  const walk = (el) => {
    if (SKIP.has(el.tagName)) return;
    const tag = el.tagName.toLowerCase();
    const isUnit = el.matches(UNIT) || el.getAttribute("role") === "button" || el.getAttribute("role") === "heading";
    const hasBlock = el.querySelector(BLOCK_DESC) !== null;
    if (isUnit && (!hasBlock || /^h[1-6]$/.test(tag))) return capture(el);
    if (!isUnit && !hasBlock && el.children.length === 0) return capture(el);
    if (!isUnit && !hasBlock && inlineOnly(el)) return capture(el);
    // Text sitting directly in a container beside block children is captured on its own.
    for (const node of el.childNodes) {
      if (node.nodeType === 1) walk(node);
      else if (node.nodeType === 3 && /[\p{L}\p{N}]/u.test(node.textContent) && el.children.length) {
        const text = norm(node.textContent);
        if (text.split(" ").length >= 2) {
          const range = document.createRange();
          range.selectNode(node);
          const r = range.getBoundingClientRect();
          units.push({ text, type: "p", visible: r.width > 2 && visible(el), collapsed: null, overlay: isFixed(el), group: null, item: null, sec: sectionFor(el), top: Math.round(r.top + window.scrollY), height: Math.round(r.height) });
        }
      }
    }
  };
  walk(document.body);

  const sections = sectionEls.map((e, i) => {
    const r = e.getBoundingClientRect();
    return {
      index: i,
      tag: e.tagName.toLowerCase(),
      role: e.getAttribute("role") || null,
      label: e.getAttribute("aria-label") || null,
      id: e.id || null,
      fullWidth: r.width >= 0.9 * VW,
      top: Math.round(r.top + window.scrollY),
      height: Math.round(r.height),
      inMain: Boolean(main && main.contains(e)),
    };
  });

  return { units, sections, title: document.title, url: location.href, viewport: VW };
}

/** Wrap one of the functions above as a page expression. */
export const asExpression = (fn) => `(${fn.toString()})()`;
