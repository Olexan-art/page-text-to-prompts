# Page text to prompts

An Agent Skill from [GetLoopLoop](https://www.getlooploop.com) for Claude Code, claude.ai, Codex, opencode and other agents that load `SKILL.md` skills. Version **1.001**, private.

Give it a URL. It splits the page's copy into blocks (hero, benefits, how it works, testimonials, pricing, FAQ, CTA…) and, for every block, writes what the block does, how it is built (parts, order, words and characters per part, techniques, tone), a reusable prompt that writes the same kind of block for another product, and an example written from that prompt and measured against it. It copies the shape of the text, never the text: a script refuses any result that shares six words in a row with the page or names its brand.

The page is read three ways and compared: the raw HTML, the page rendered in the browser already on the machine (a fresh throwaway profile, desktop 1440 × 900, scrolled, FAQ opened), and its accessibility tree. So the report can say which text appears only after JavaScript, which was folded behind a click, and which exists only for screen readers.

The scripts call no model and no API. The agent running the skill does the analysis; the scripts fetch, measure and check.

![The report's head: the page, its measured pills, where each number comes from, and the result](docs/report-light.png)

## The report

The skeleton of the page, each block's width its word count, and what each layer sees of every block:

![The page skeleton and who sees what](docs/report-layers.png)

The page profile: the reader's awareness, the main promise with variables, the persuasion logic and the threads that run through the page:

![The page profile](docs/report-profile.png)

Every block: its job, its structure with word ranges (the dot is the example's count), the techniques written as instructions, the prompt, and the example written from it, each element measured against its range:

![One block: structure, techniques, prompt and measured example](docs/report-block.png)

Repeated cards are one group with a count; elements that stand for facts (prices, clients, guarantees) are drawn as sample data the user must replace, and the prompt forbids inventing them:

![The pricing block: three plans as one group, facts marked as sample data](docs/report-pricing.png)

The same report in the dark theme:

![The report, dark theme](docs/report-dark.png)

These screenshots are the test fixture (`tests/fixtures/studio.html`, a fictional studio) read from a saved file, so only the HTML layer appears; a live URL adds the render and accessibility layers.

## Install

Download `page-text-to-prompts.zip` from the latest release and either upload it to claude.ai (Customize › Skills › Upload a skill) or unpack it into your agent's skills folder (for Claude Code, `~/.claude/skills/`). No `npm install`: `dist/` carries everything. Node 22 or later; Chrome, Chromium or Edge for the render (`CHROME_PATH` to choose one), and without one only the HTML layer is read.

## Develop

```
cd skills/page-text-to-prompts
npm install
node scripts/read.mjs https://example.com/ --out page.json
# the agent writes analysis.json (see SKILL.md and references/analysis-schema.md)
node scripts/build.mjs page.json analysis.json --html report.html --md page-prompts.md --json page-prompts.json
npm test          # node:test suite
npm run bundle    # rebuild dist/ after changing scripts/
npm run zip       # dist-release/page-text-to-prompts.zip
```

## Layout

```
skills/page-text-to-prompts/
  SKILL.md                  instructions for the agent
  references/               block types, the variable dictionary, the analysis.json schema
  scripts/read.mjs          step 1: three layers → page.json
  scripts/build.mjs         step 3: six checks → report.html, page-prompts.md, page-prompts.json
  scripts/lib/              the layers, the checks, the report
  dist/                     the same scripts bundled with cheerio: no npm install
  tools/                    the bundler and the zip packer
  tests/                    node:test suite and a fixture page with a passing analysis
```
