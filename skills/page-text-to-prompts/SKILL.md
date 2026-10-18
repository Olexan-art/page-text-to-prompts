---
name: page-text-to-prompts
description: Break a web page's copy into its blocks (hero, benefits, how it works, testimonials, pricing, FAQ, CTA and so on) and write, for each block, a reusable prompt that produces the same kind of text for a different product, with a worked example measured against it. Reads the page three ways (raw HTML, the rendered desktop page in a local browser, the accessibility tree) so JavaScript-only, folded and screen-reader-only text are told apart, and draws the result as an HTML report. Copy only; design is ignored. Use when the user gives a URL and wants to "break down this landing page", "reverse-engineer the copy", "make prompts for each section", "write a block like this for my site", "how is this competitor's page written", or a copywriting template from a page. Ukrainian requests too: «розбери сторінку на блоки», «зроби промти під кожен блок», «як написаний лендинг конкурента», «хочу такий самий блок у себе».
---

# Page text to prompts

**In plain words, for people opening this file:** you give it a link. It reads the page, splits the copy into blocks, and for every block says what the block does, how it is built (which parts, in what order, how long each one is, which techniques), and gives a prompt you can paste to get the same kind of block written for your own product, plus a short example of what that prompt produces. It copies the *shape* of the text, never the text itself. No API key and no service: the scripts run on this machine, and the analysis is done by you, the agent the user is talking to.

Three steps. Steps 1 and 3 are scripts. Step 2 is your judgement. Run every command from this skill's folder.

**Do not ask the user anything before starting.** A URL is enough; every option has a default below. Ask only if no URL was given.

**No install step.** The scripts in `dist/` carry everything they need; run them with Node 22 or later. Rendering uses Chrome, Chromium or Edge already on the machine (set `CHROME_PATH` to point at one); nothing is downloaded. With no browser, step 1 still works from the raw HTML and says so.

## Defaults (use them, do not ask)

| Option | Default | Override when |
|---|---|---|
| Language of prompts, examples and report | the language the user writes in | the user names another |
| Product and audience | none: prompts use variables, examples use one fictional product | the user names their product, or it is plain from the conversation or the project you work in |
| Header and footer | skipped when they hold only navigation and contacts | they carry an offer |
| Viewport | desktop 1440 × 900 | never: there is no mobile pass |

## 1. Read the page

```
node dist/read.mjs <url> --out page.json
```

The script reads three layers and compares them:

| Layer | How | What it tells |
|---|---|---|
| `html` | one plain GET, no JavaScript | what is in the page source: what a crawler without JavaScript gets |
| `render` | the local browser with a fresh throwaway profile: waits for the network to settle, scrolls to the bottom, opens `<details>` and FAQ disclosures | what a visitor can see |
| `a11y` | the rendered page's accessibility tree | what a screen reader gets, including names that exist only for it |

Every text element gets a `status`:

| `status` | Meaning | Analysed? |
|---|---|---|
| `ok` | in all three layers | yes |
| `js_only` | visible, absent from the source HTML | yes; counted |
| `collapsed` | hidden until a click (accordion, tab, slide, price toggle) | yes, marked |
| `not_in_a11y` | visible, missing from the accessibility tree | yes; counted |
| `hidden` | in the markup, never shown | no; counted in `visibility.hidden` |

Names that exist only in the accessibility tree (aria-labels, image alt text, screen-reader text) are counted in `visibility.a11yOnly`. Popups are not removed; text in a fixed overlay is set aside as `overlay` or `cookie_banner`.

`page.json` holds `page` (URL, `lang`, `title`, `metaDescription`, Open Graph, `rendered`, `layers`), `visibility`, `blocks` (candidates `b01`…, each with the `evidence` for its boundaries, `words`, `statusWords` and `elements`: `type`, `text`, `words`, `chars`, `group` and `item` for repeated cards, `status`) and `excluded` (navigation, header, footer, overlays, legal lines, each with a reason).

A saved page goes in with `node dist/read.mjs --file saved.html --url <its address> --out page.json`; only the `html` layer is read then.

If the script prints `REFUSED <code>` (exit 2), stop and tell the user what the code means (table at the end).

## 2. Analyse and write the prompts (your judgement)

Read `page.json` in full, then `references/block-types.md`, `references/variables.md` and `references/analysis-schema.md`.

**Confirm the blocks.** The candidates are a proposal. Join or drop them so each block does one job for the reader, through `source_blocks` and `dropped`. An eyebrow belongs to the block below it; a run of numbers with short labels is a `stats` block; two CTA blocks stay two, because their job depends on where they stand.

**Analyse each block from its text only:**

- `block_type` from the list, or `other` with `block_type_reason`; a short `name` in the user's language.
- `role`: one sentence, the job this block does for the reader at this point of the page.
- `structure`: the elements in order, each with `words` and `chars` ranges taken from the original and rounded (6 words, 41 chars → `[5, 7]`, `[35, 50]`), a `must` saying what it contains, and `fact: true` where it stands for a fact. Repeated cards are one element with `count` and `children`; a bullet list is a leaf with `items: [min, max]`. Keep the shape of social proof without its content: "name + role + company".
- `techniques`: only what is in the text, each written as an instruction, never as a label. Not "uses PAS" but "name the reader's problem in one sentence, show what it costs in the second, bring in {product} only in the third".
- `tone` (adjectives, formality 1–5, address) and `avoids` (what is deliberately absent, only where the text shows it).

**Write the prompt** so it works for someone who never saw the page: the block, `{product}` and `{audience}`, the language to write in, the job, the structure with ranges, the techniques, tone, what to avoid, and a facts line. Use the canonical variable names in every block. Every fact variable is declared with `fact: true`, and the prompt says to leave its element out when the value is not given, never to invent a number, a client, a name or a guarantee. When the language is Ukrainian, say "Пиши українською" in the prompt.

**Write the example**: the block for one fictional product (`example_product`, the same for the whole page), following your own prompt, element by element, within its ranges. If the user's product is known, write it for their product and fill `filled_prompt`.

**Profile the page**: `page_type`, `audience`, `awareness` (`unaware`, `problem_aware`, `comparing_solutions`, `product_aware`, `ready_to_buy`), `tone`, `main_promise` with variables, `skeleton`, `persuasion_logic` (why the blocks stand in this order) and `threads` (what runs through the page).

**The original-text rule.** Nothing from the page is reproduced: no headings, sentences, reviews, brand or product names, people's names. Step 3 refuses any output string that shares six consecutive words with the page or names the brand.

Write `analysis.json` in the shape `references/analysis-schema.md` gives.

## 3. Check and build

```
node dist/build.mjs page.json analysis.json --html report.html --md page-prompts.md --json page-prompts.json
```

The script runs six checks and writes nothing unless all pass:

| Check | Refuses when |
|---|---|
| `overlap` | any output string shares six consecutive words with the page |
| `brand` | the name from the domain or `og:site_name` appears in the output |
| `volume` | an element lacks a `words` or `chars` range, or a group lacks a `count` |
| `variables` | a `{variable}` is used but not declared, or a canonical fact is not `fact: true` |
| `example` | an example misses an element or a card, or is more than 20% outside a range |
| `blocks` | a candidate is used twice, used nowhere and not dropped, or unknown |

On `REFUSED analysis.json: …` fix every line it lists and run it again.

## Presenting the result

- **The report first.** If this session can publish HTML pages, publish `report.html` and give the link; otherwise give its absolute path and offer to open it in the browser.
- In chat, briefly: how many blocks, the skeleton, one or two of the most useful techniques, and the visibility notes when they matter ("a fifth of the text appears only after JavaScript", "the FAQ answers are folded").
- Do not paste every prompt into the chat. If the user asked about one block ("I want a pricing block like theirs"), show that block's prompt and example in full.
- Say once that the blocks, prompts and examples are your reading of the page; the layers, counts and checks are the scripts'.

## Limits

- One public URL per run. Localhost, private addresses, non-standard ports and non-http(s) URLs are refused; every redirect hop is checked (5 at most).
- No login and no cookies: the page is read as an anonymous visitor sees it. A captcha or bot check is never bypassed.
- Desktop only. Text drawn in images is not read. Design is not described.
- 12-second fetch, 15-second settle, 3,000,000-character ceiling, HTML only.
- Pages in Russian, and sites in Russia's domain zone, hosted in Russia or with a Russian-language version, are not analysed.

## Refusal codes

| Code | Tell the user |
|---|---|
| `invalid_url` | That is not a web address. Ask for the full URL of a page. |
| `blocked_scheme`, `blocked_host`, `blocked_address` | The address is local, private or not http(s), so it cannot be read. |
| `unreachable` | The site did not answer. |
| `http_error` | The site answered with an error or refused automated readers (the status is printed). Offer to work from pasted HTML. |
| `challenge` | The site shows a captcha or bot check. Do not try to get past it; offer to work from a saved page. |
| `not_html`, `too_large` | The link is not a web page, or the page is too large. |
| `empty` | No readable text was found. The copy is probably in images. |
| `refused_ru_domain`, `refused_ru_hosting`, `refused_ru_audience`, `refused_language_ru` | The skill does not analyse this page: it is in Russian, or the site is in Russia's domain zone, hosted in Russia or has a Russian-language version. This is the publisher's decision. |
