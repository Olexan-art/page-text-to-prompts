Read this when you need a `{variable}` in a `must` or a technique, or want to add one.

# Variables

Use these names in every block, so prompts from different pages fit together. Keys stay in English in every language. Write the explanation (`means`) in the user's language.

A **fact** variable stands for a true value. The prompt tells the writer to leave its element out when the value is missing, and never to invent it.

| Variable | What goes in | Fact |
|---|---|---|
| `product` | the product's name and what it is, in a few words | |
| `category` | the kind of product (invoicing tool, dental clinic, online course) | |
| `audience` | who reads the page: role, situation | |
| `language` | the language of the block | |
| `pain` | the reader's main problem | |
| `pain_n` | further problems, numbered | |
| `main_benefit` | the main result the reader gets | |
| `benefit_n` | further results, numbered | |
| `feature_n` | what the product does, numbered | |
| `step_n` | steps to start or use it, numbered | |
| `use_case_n` | a role or scenario the product serves | |
| `alternative` | what the reader does today instead (a spreadsheet, an agency, nothing) | |
| `objection_n` | a doubt the reader has, numbered | |
| `cta_action` | the action the button asks for (start a trial, book a call) | |
| `risk_remover` | what makes the first step safe (no card, cancel any time) | fact |
| `outcome_number` | a measured result (saves 6 hours a week) | fact |
| `customer_count` | how many customers or users | fact |
| `customer_n` | a named customer or logo | fact |
| `testimonial_n` | a real quote with name, role, company | fact |
| `plan_n` | a plan's name, price and contents | fact |
| `guarantee` | what is guaranteed and on what terms | fact |
| `deadline` | a real date or limit, for urgency | fact |

## New variables

- Add one only when no name above fits.
- Use a short snake_case name.
- In `analysis.md`, write it under `vars:` as `- name: what goes in`. Add `[fact]` for a fact.
- The build refuses a `{name}` that is not declared (`variables`).
