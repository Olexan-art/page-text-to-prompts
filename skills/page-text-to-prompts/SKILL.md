---
name: page-text-to-prompts
description: Splits the copy of a web page into blocks (hero, benefits, how it works, testimonials, pricing, FAQ, CTA and others) and writes 1 reusable prompt per block. Each prompt writes the same kind of text for a different product and has an example checked against it. Copy only; the design is ignored. Use when the user gives a URL and asks to break down or reverse-engineer the copy of a landing page, make prompts per section, write a similar block for their site, or see how a competitor's page is written.
---

Version 1.007.

# Page text to prompts

## Purpose

The scripts read 1 web page and cut its copy into candidate blocks. You write a short judgement file; the build turns it into a prompt and a measured example per block. Text only: 1 public page, desktop, no login, no captcha bypass, no text in images.

## Requirements

- Node 22 or later. No install, no API key. Run the scripts in `dist/` from this skill's folder.
- Network access from the shell.

## Rules

- R1. Do not ask the user anything first. A URL is enough.
- R2. **Own words.** No line you write may repeat 6 consecutive words of the page, case and punctuation ignored (`overlap`). This covers every field and every example.
- R3. Do not name the site's brand: domain name, `og:site_name` (`brand`). Do not use any name from the page.
- R4. Write `analysis.md` and every input file with the file-writing tool, never a shell heredoc. If the tool refuses (some harnesses refuse `.md` files from a subagent), write the file under another name and copy it with `cp`.
- R5. Never re-create the scripts' work by hand. Do not count words or characters. Do not write prompts.
- R6. Never invent facts. Never write Russian text. The scripts call no model.

## Procedure

Every path below may point anywhere writable; `work/` is the default, not a rule.

1. **Read (script).** `node dist/read.mjs <url> --out work/page.json`
   - Options: `--no-render` (source HTML only), `--lang <code>` (draft language).
   - Result: in `work/`, `brief.md` (read this), `analysis.md` (the draft, 1 header per candidate with a guessed type) and `page.json` (for the build; do not open it). If `analysis.md` exists, the draft goes to `analysis.draft.md`.
   - `brief.md` has 1 line per element: type, word count, status (`js_only`, `collapsed`, `not_in_a11y`, or none for `ok`), text, grouped by candidate `bNN`. `[g3#2]` is card 2 of group `g3`.
   - Time: 5 to 30 seconds. The render stops after 45 seconds and the read continues from the HTML.
   - On failure: `REFUSED <code>` (exit 2): stop and tell the user (see Refusal codes). If the scripts cannot run (no Node 22, no shell, no network), tell the user in 1 line and offer the saved-page route.
2. **Fill in `work/analysis.md` (judgement).** See the next section. Write in English, or in the language the user asked for, with its code in `language:`.
3. **Build (script).** `node dist/build.mjs work/page.json work/analysis.md --html work/report.html --md work/page-prompts.md --json work/page-prompts.json`
   - Result: the 3 files and `checks: 5 of 5 passed`. Examples off their range are warnings only.
   - On failure: `REFUSED` lists each problem with its check: `overlap` (R2), `brand` (R3), `volume` (no word range), `variables` (undeclared `{name}`), `blocks` (candidate missing, unknown or used twice), `schema` (missing field or value not allowed), or a line that cannot be read. Fix only the listed lines and run the build again.

## analysis.md

Take word counts from `brief.md` and write ranges around them. Leave out character ranges.

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

**Allowed values** (the build refuses others):

- `awareness`: `unaware`, `problem_aware`, `comparing_solutions`, `product_aware`, `ready_to_buy`.
- Block type: `hero`, `social_proof_logos`, `problem`, `solution`, `features`, `benefits`, `how_it_works`, `use_cases`, `testimonials`, `case_study`, `stats`, `comparison`, `pricing`, `faq`, `guarantee`, `about`, `team`, `cta`, `lead_form`, `newsletter`, `other`. `other` needs a `reason:` line.
- `formality`: 1 digit, 1 to 5 (the report shows "N of 5"; not refused).
- `language`: an ISO code; `uk` gives Ukrainian prompts, any other code English prompts.
- `page_type`: free text.
- Variables: `product`, `category`, `audience`, `language`, `pain`, `pain_n`, `main_benefit`, `benefit_n`, `feature_n`, `step_n`, `use_case_n`, `alternative`, `objection_n`, `cta_action`; facts `risk_remover`, `outcome_number`, `customer_count`, `customer_n`, `testimonial_n`, `plan_n`, `guarantee`, `deadline`. Declare a new one under `vars:` as `- name: what goes in`, with `[fact]` for a fact.

**Required:** `language`, `example_product`, `page_type`, `audience`, `awareness`, `promise`, `logic`; per block a type, a name, `role`, 1 or more elements, 1 or more techniques.

**Line formats:**

- Element: `code "Label" | words | must | example`. `must` becomes that line of the prompt.
- Group: `N x code "Label":` with indented children; the example is 1 card. Groups do not nest.
- List: `items N`; separate example items with ` / `.
- Join candidates: `| b03 b04` in the header. Drop one: `drop: b10 <reason>` near the top.

**Rules most often broken:**

- 1 block, 1 job. Leave out decorative text (widget labels, counters).
- Each candidate goes in exactly 1 block or is dropped. A candidate cannot be split.
- A very large candidate (for example a 1,400-word article with many subsections) stays 1 block: write its repeated subsections as 1 group, for example `5 x section "Section":` with `h3` and `text`. Use the closest type, or `other`.
- Techniques are instructions, not labels: not "uses PAS" but "name the problem in 1 sentence, its cost in the second, {product} in the third". Only what the text does.
- The example is the block for 1 fictional product. Near the range is enough.

## Verification

- [ ] Every candidate is in 1 block or dropped.
- [ ] The final build printed no `REFUSED`.
- [ ] `work/report.html` exists.

## Show the report

- If the user or caller said not to publish or open anything, stop when `report.html` exists and give its path.
- Otherwise publish `report.html` if this session can publish HTML; if not, give its absolute path.
- The report opens in English with an EN / UK switch; `#lang=uk` opens it in Ukrainian.

## Chat summary

- The number of blocks, the skeleton, 1 or 2 useful techniques.
- Visibility notes that matter: text only after JavaScript, folded FAQ answers.
- Do not paste every prompt. If the user asked about 1 block, show its prompt and example.
- Say once: the blocks and wording are your reading; the layers, counts and checks are the scripts'.

## Refusal codes

Saved-page route: `node dist/read.mjs --file saved.html --url <address> --out work/page.json`.

| Code | Tell the user |
|---|---|
| `invalid_url`, `blocked_scheme`, `blocked_host`, `blocked_address` | Not a public web address. |
| `unreachable`, `http_error`, `blocked` | The site did not answer or refused automated readers (`blocked`: HTTP 401, 403 or 429). Offer the saved-page route. |
| `challenge` | A captcha or bot check. Do not get past it; offer the saved-page route. |
| `not_html`, `too_large`, `empty` | Not a readable web page, or no text (probably images). |
| `refused_ru_domain`, `refused_ru_hosting`, `refused_ru_audience`, `refused_language_ru` | Not analysed: a page in Russian, or a site in Russia's domain zone, hosted in Russia or with a Russian-language version. The publisher's decision. |

## References

| File | Read when |
|---|---|
| `references/block-types.md` | You are unsure of a block type. |
| `references/variables.md` | You need a `{variable}` or add one. |
| `references/analysis-schema.md` | You need the full format or the JSON form. |
