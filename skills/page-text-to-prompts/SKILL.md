---
name: page-text-to-prompts
description: Break a web page's copy into its blocks (hero, benefits, how it works, testimonials, pricing, FAQ, CTA and so on) and produce, for each block, a reusable prompt that writes the same kind of text for a different product, with an example measured against it. Reads the page as raw HTML, as rendered in a local browser and as its accessibility tree, and draws an HTML report in English and Ukrainian. Copy only; design is ignored. Use when the user gives a URL and wants to "break down this landing page", "reverse-engineer the copy", "make prompts for each section", "write a block like this for my site", "how is this competitor's page written", or a copywriting template from a page. Ukrainian requests too: «розбери сторінку на блоки», «зроби промти під кожен блок», «як написаний лендинг конкурента», «хочу такий самий блок у себе».
---

# Page text to prompts

You give it a link; it tells you how each block of the page's copy is built and gives you a prompt that writes the same kind of block for your own product. The scripts read, measure, assemble the prompts and check; you only write the judgements, in a short text file. No API key, no install step: run the scripts in `dist/` with Node 22+. Run every command from this skill's folder. **Do not ask the user anything first**; a URL is enough.

## 1. Read

```
node dist/read.mjs <url> --out work/page.json
```

It reads the page three ways (source HTML, a render in the local Chrome or Edge with a throwaway profile, the accessibility tree), cuts it into candidate blocks `b01…`, and writes three files to `work/`:

- `brief.md`: **read this, not page.json.** The page as plain lines, one per element, with its type, its word count and its status (`js_only`, `collapsed`, `not_in_a11y` when not plain `ok`), grouped by candidate. `[g3#2]` marks card 2 of a repeated group.
- `analysis.md`: the draft you fill in, one header per candidate with a guessed type.
- `page.json`: everything, for the build. You do not need to open it.

`REFUSED <code>` (exit 2) means stop and tell the user (codes at the end).

## 2. Fill in `work/analysis.md`

Keep it short. **Do not count words or characters**: take the word counts from `brief.md`, write ranges around them, and leave characters out (the script derives them). **Do not write prompts**: the build assembles each prompt from the lines below. Write in **English** unless the user asked for another language; then set `language:` to its code (e.g. `uk`) and write everything in it.

```
language: en
example_product: a fictional booking app for small pilates studios
page_type: SaaS landing
audience: owners of small studios who take bookings by chat
awareness: comparing_solutions
tone: businesslike, warm; formality 2; you
promise: {product} gives {audience} {main_benefit} without {pain}.
logic: result and first step first, proof next, the steps before the prices
threads:
- the promise of no more calls returns in the hero, the steps and the closing call

## p01 hero | Hero | b01
role: say within five seconds what changes for the reader, and offer the first step
- eyebrow | 3-5 | the main change for the reader | No more booking calls
- h1 "Headline" | 7-11 | the result for {audience}, without the product's name | Clients reserve a reformer, and you stay with the class
- button | 2-4 | verb + object, the action {cta_action} | Set up bookings
- risk_line | 5-8 | {risk_remover} | Free to start, cancel at any time
techniques:
- Keep {product}'s name out of the headline; it first appears in the subheadline.
tone: businesslike, warm; you
avoid: "innovative"; a question as the headline

## p07 pricing | Pricing | b07
role: help the reader pick a plan and see the price fits the studio's size
- h2 | 4-8 | the price tied to the reader's size | Pay for the size you are
- 3 x plan "Plan":
  - h3 | 1-3 | the studio's size | Single room
  - price | 1-3 | {plan_n} | [price] / mo
  - items 3 | 2-6 | what is included, most important first | Self-service reservations / Client reminders / Card checkout
techniques:
- Name the plans after the studio's size, not after levels such as basic or pro.
```

The rules that matter:

- **One block, one job.** Join candidates by listing several ids in the header (`| b03 b04`); drop one with `drop: b10 why` near the top. Every candidate must end up in a block or dropped. Leave out decorative text (widget labels, counters) that no copywriter would write.
- **An element line** is `code "Label" | words | must | example`. `must` says what the element contains; it becomes that line of the prompt. A repeated card group is `N x code:` with indented children, and the example is **one** card. A bullet list is `items N`, with examples separated by ` / `.
- **Block types**: hero, social_proof_logos, problem, solution, features, benefits, how_it_works, use_cases, testimonials, case_study, stats, comparison, pricing, faq, guarantee, about, team, cta, lead_form, newsletter, other.
- **Techniques** are instructions, not labels: not "uses PAS" but "name the problem in one sentence, show what it costs in the second, bring in {product} only in the third". Only what the text really does.
- **Variables**: product, audience, pain, pain_n, main_benefit, benefit_n, feature_n, step_n, use_case_n, alternative, objection_n, cta_action, and the facts risk_remover, outcome_number, customer_count, customer_n, testimonial_n, plan_n, guarantee, deadline. A new one goes under `vars:` as `- name: what goes in` (add `[fact]` for a fact). Facts are never invented; the prompt says so by itself.
- **The example** is the block written for one fictional product, element by element. Near the range is enough: the build measures it and marks misses in the report without refusing.
- **Nothing from the page**: no sentence, brand or name of the original. The build refuses any line that shares six words in a row with the page or names the brand.

## 3. Build

```
node dist/build.mjs work/page.json work/analysis.md --html work/report.html --md work/page-prompts.md --json work/page-prompts.json
```

It refuses only for: text copied from the page (`overlap`), the brand (`brand`), a missing range (`volume`), an undeclared variable (`variables`), a candidate lost or used twice (`blocks`), or a line it cannot read. Fix exactly what it lists and run it again; do not rewrite anything else.

## Presenting

Publish `report.html` if this session can publish HTML, otherwise give its absolute path. It opens in English with an EN / UK switch (`#lang=uk` opens it in Ukrainian). In chat, say how many blocks, the skeleton, one or two useful techniques, and visibility notes that matter (text only after JavaScript, folded FAQ answers). Do not paste every prompt; if the user asked about one block, show that block's prompt and example. Say once that the blocks and wording are your reading; the layers, counts and checks are the scripts'.

## Limits and refusal codes

One public page per run, desktop only, no login, no captcha bypass, text in images not read. Pages in Russian and sites in Russia's domain zone, hosted in Russia or with a Russian-language version are not analysed.

| Code | Tell the user |
|---|---|
| `invalid_url`, `blocked_scheme`, `blocked_host`, `blocked_address` | Not a public web address. |
| `unreachable`, `http_error` | The site did not answer, or refused automated readers. Offer to work from a saved page: `node dist/read.mjs --file saved.html --url <address> --out work/page.json`. |
| `challenge` | A captcha or bot check. Do not get past it; offer the saved-page route. |
| `not_html`, `too_large`, `empty` | Not a readable web page, or no text (probably images). |
| `refused_ru_domain`, `refused_ru_hosting`, `refused_ru_audience`, `refused_language_ru` | Not analysed: Russian page or Russian site. The publisher's decision. |
