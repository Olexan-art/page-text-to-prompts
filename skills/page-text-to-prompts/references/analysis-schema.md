# analysis.json

What step 2 writes and step 3 checks. `tests/fixtures/studio-analysis.json` is a complete, passing example.

```json
{
  "language": "uk",
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

- `element` is a short code (`h1`, `eyebrow`, `button`, `answer`…); `label` is how the report and the markdown name it, in the user's language.
- `words`, `chars` and `items` are inclusive `[min, max]` ranges.
- A group has `count` and `children` and no ranges of its own. Its example entry has `items`: one list per card, each list mirroring `children`, and exactly `count` cards.
- A bullet-list leaf has `items: [min, max]`; its example entry has `list` instead of `text`.
- The example mirrors `structure` element by element, in order. The report sets the element's look from its code: `h1`, `h2`, `eyebrow`, `button`, `link`, `price`, `quote`, and anything with `title`, `name` or `question` reads as a heading.
- `fact: true` on an element marks it in the report as sample data. Canonical fact variables (`risk_remover`, `outcome_number`, `customer_count`, `customer_n`, `testimonial_n`, `plan_n`, `guarantee`, `deadline`) must be declared with `"fact": true`.
- Every candidate `bNN` in `page.json` appears exactly once, in some block's `source_blocks` or in `dropped`.
