Read this when you need the full form of the analysis, or when you write `analysis.json` instead of `analysis.md`.

# analysis.json (the full form)

The build turns `analysis.md` into this object, and also accepts it directly. The repository (not the installed skill) holds passing examples: `tests/fixtures/studio-analysis.en.md` and `tests/fixtures/studio-analysis.json`.

```json
{
  "language": "en",
  "example_product": "a fictional booking app for small pilates studios",
  "profile": {
    "page_type": "SaaS landing",
    "audience": "Owners of small studios who book classes by chat and spreadsheet.",
    "awareness": "comparing_solutions",
    "tone": { "adjectives": ["businesslike", "warm"], "formality": 2, "address": "formal you" },
    "main_promise": "{product} gives {audience} {main_benefit} without {pain}.",
    "skeleton": ["hero", "features", "pricing", "faq", "cta"],
    "persuasion_logic": "…",
    "threads": ["…"]
  },
  "variables": {
    "product": { "means": "…", "fact": false },
    "risk_remover": { "means": "…", "fact": true }
  },
  "dropped": [{ "id": "b10", "reason": "a newsletter strip repeated from the footer" }],
  "blocks": [
    {
      "id": "p01",
      "source_blocks": ["b01"],
      "block_type": "hero",
      "name": "Hero",
      "role": "…",
      "structure": [
        { "element": "eyebrow", "label": "Eyebrow", "words": [2, 4], "chars": [12, 30], "must": "…" },
        { "element": "cards", "label": "Card", "count": 3, "children": [
          { "element": "h3", "label": "Title", "words": [2, 3], "chars": [10, 24], "must": "…" },
          { "element": "features", "label": "Bullets", "items": [3, 3], "words": [2, 5], "chars": [8, 40], "must": "…" }
        ] },
        { "element": "risk_line", "label": "Line under the button", "words": [3, 7], "chars": [20, 45], "must": "{risk_remover}", "fact": true }
      ],
      "techniques": ["…"],
      "tone": { "adjectives": ["…"], "formality": 2, "address": "…" },
      "avoids": ["…"],
      "prompt": "…",
      "example": [
        { "element": "eyebrow", "text": "…" },
        { "element": "cards", "items": [
          [{ "element": "h3", "text": "…" }, { "element": "features", "list": ["…", "…", "…"] }]
        ] },
        { "element": "risk_line", "text": "…" }
      ],
      "filled_prompt": null
    }
  ]
}
```

## Rules

- `element` is a short code (`h1`, `eyebrow`, `button`, `answer`, …). `label` names it in the report, in the user's language.
- `words`, `chars` and `items` are inclusive `[min, max]` ranges.
- `profile.awareness`, `block_type` and `tone.formality` take the values listed in SKILL.md. `other` needs `block_type_reason`.
- A group has `count` and `children`, no ranges, and does not nest. Its example entry has `items`: 1 to `count` cards, each a list mirroring `children`.
- A bullet-list leaf has `items: [min, max]`. Its example entry has `list`, not `text`.
- The example mirrors `structure` element by element, in order.
- The report styles `h1`, `h2`, `eyebrow`, `button`, `link`, `price`, `quote` and any code with `title`, `name` or `question` as headings.
- `fact: true` on an element marks it as sample data in the report. Declare each fact variable with `"fact": true`.
- `prompt`, when present, replaces the assembled prompt.
- Each candidate `bNN` in `page.json` appears exactly once: in 1 `source_blocks`, or in `dropped` with a reason.
