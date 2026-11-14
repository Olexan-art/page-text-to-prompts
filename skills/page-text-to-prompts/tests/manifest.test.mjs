// The plugin manifests at the repository root (Antigravity: plugin.json and
// .agents/plugins/marketplace.json; Gemini CLI: gemini-extension.json; Claude Code: .claude-plugin/)
// each write the version and the name again. Copies drift, so this test holds them to package.json
// and to what the READMEs tell people to type.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const PLUGIN = "page-text-to-prompts";
const REPO = "page-text-to-prompts";
const READMES = ["README.md"];
const root = new URL("../../../", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, root), "utf8"));
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("every plugin manifest names the skill's version", () => {
  assert.equal(json("plugin.json").version, pkg.version, "plugin.json");
  assert.equal(json("gemini-extension.json").version, pkg.version, "gemini-extension.json");
  assert.equal(json(".claude-plugin/plugin.json").version, pkg.version, ".claude-plugin/plugin.json");
  for (const p of [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"]) {
    for (const plugin of json(p).plugins) assert.equal(plugin.version, pkg.version, `${p}: ${plugin.name}`);
  }
});

test("the manifests name the skill and one marketplace, as the READMEs tell people to type", () => {
  const names = [json("plugin.json").name, json("gemini-extension.json").name, json(".claude-plugin/plugin.json").name, ...json(".claude-plugin/marketplace.json").plugins.map((p) => p.name), ...json(".agents/plugins/marketplace.json").plugins.map((p) => p.name)];
  assert.deepEqual([...new Set(names)], [PLUGIN]);
  const market = json(".claude-plugin/marketplace.json").name;
  assert.equal(market, json(".agents/plugins/marketplace.json").name);
  for (const readme of READMES) {
    const text = readFileSync(new URL(readme, root), "utf8");
    assert.ok(text.includes(`agy plugin install https://github.com/Olexan-art/${REPO}`), `${readme}: Antigravity`);
    assert.ok(text.includes(`/plugin marketplace add Olexan-art/${REPO}`), `${readme}: Claude Code marketplace`);
    assert.ok(text.includes(`/plugin install ${PLUGIN}@${market}`), `${readme}: Claude Code install`);
  }
});
