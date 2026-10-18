# Page text to prompts

An Agent Skill from [GetLoopLoop](https://www.getlooploop.com) for Claude Code, claude.ai, Codex, opencode and other agents that load `SKILL.md` skills. Version **1.001**, private.

Give it a URL. It splits the page's copy into blocks (hero, benefits, how it works, testimonials, pricing, FAQ, CTA…) and, for every block, writes what the block does, how it is built (parts, order, words and characters per part, techniques, tone), a reusable prompt that writes the same kind of block for another product, and an example written from that prompt and measured against it. It copies the shape of the text, never the text: a script refuses any result that shares six words in a row with the page or names its brand.

The page is read three ways and compared: the raw HTML, the page rendered in the browser already on the machine (a fresh throwaway profile, desktop 1440 × 900, scrolled, FAQ opened), and its accessibility tree. So the report can say which text appears only after JavaScript, which was folded behind a click, and which exists only for screen readers.

The scripts call no model and no API. The agent running the skill does the analysis; the scripts fetch, measure and check.

## Use

```
cd skills/page-text-to-prompts
npm install --omit=dev
node scripts/read.mjs https://example.com/ --out page.json
# the agent writes analysis.json (see SKILL.md and references/analysis-schema.md)
node scripts/build.mjs page.json analysis.json --html report.html --md page-prompts.md --json page-prompts.json
npm test
```

Node 22 or later. Chrome, Chromium or Edge for the render (`CHROME_PATH` to choose one); without one, only the HTML layer is read.

## Layout

```
skills/page-text-to-prompts/
  SKILL.md                  instructions for the agent
  references/               block types, the variable dictionary, the analysis.json schema
  scripts/read.mjs          step 1: three layers → page.json
  scripts/build.mjs         step 3: six checks → report.html, page-prompts.md, page-prompts.json
  scripts/lib/              the layers, the checks, the report
  tests/                    node:test suite and a fixture page with a passing analysis
```
