#!/usr/bin/env node
// Bundles the two entry scripts, scripts/read.mjs and scripts/build.mjs, with everything they import
// (scripts/lib and cheerio) into dist/, so the skill runs with plain `node` from a folder installed on
// its own, with no npm install. The readable source of truth is scripts/.
//
//   npm run bundle           writes dist/

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SKILL_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const ENTRIES = ["read", "build"];

const banner = () =>
  [
    "// GENERATED FILE - do not edit. Bundled by esbuild from scripts/read.mjs, scripts/build.mjs and scripts/lib/,",
    "// with cheerio inlined, so it runs with Node 22 or later and no npm install. The readable source is scripts/.",
    "// To rebuild after changing it: npm install && npm run bundle.",
    // Some bundled CommonJS dependencies call require() for Node built-ins; an ES module has none.
    'import { createRequire as __ptpCreateRequire } from "node:module";',
    "const require = __ptpCreateRequire(import.meta.url);",
  ].join("\n");

const plugins = [
  {
    // One cheerio for every module, resolved from this skill's node_modules.
    name: "one-cheerio",
    setup(build) {
      build.onResolve({ filter: /^cheerio$/ }, async (args) => {
        if (args.resolveDir === SKILL_DIR) return undefined;
        return build.resolve("cheerio", { kind: args.kind, resolveDir: SKILL_DIR });
      });
    },
  },
  {
    // cheerio imports undici only for cheerio.fromURL(), which this skill never calls.
    name: "stub-undici",
    setup(build) {
      build.onResolve({ filter: /^undici$/ }, () => ({ path: join(SKILL_DIR, "tools", "undici-stub.mjs") }));
    },
  },
  {
    // ... and encoding-sniffer (with iconv-lite's codepage tables) only for loadBuffer() and the
    // stream loaders; every page reaches cheerio.load() as text.
    name: "stub-encoding-sniffer",
    setup(build) {
      build.onResolve({ filter: /^encoding-sniffer$/ }, () => ({ path: join(SKILL_DIR, "tools", "encoding-stub.mjs") }));
    },
  },
];

export function buildOptions() {
  return {
    absWorkingDir: SKILL_DIR,
    entryPoints: Object.fromEntries(ENTRIES.map((name) => [name, join(SKILL_DIR, "scripts", `${name}.mjs`)])),
    outdir: join(SKILL_DIR, "dist"),
    entryNames: "[name]",
    chunkNames: "chunks/[name]-[hash]",
    outExtension: { ".js": ".mjs" },
    bundle: true,
    splitting: true,
    platform: "node",
    format: "esm",
    target: "node22",
    minify: true,
    // Off: keepNames wraps inner functions in a __name() helper, and the scripts in collect.mjs are
    // serialised into the page with toString(), where that helper does not exist.
    keepNames: false,
    legalComments: "eof",
    charset: "utf8",
    logLevel: "warning",
    banner: { js: banner() },
    plugins,
    write: false,
  };
}

/** Builds every file of dist/ in memory: [{ name, path, text }], the entries and their shared chunks. Throws if esbuild is not installed. */
export async function bundle() {
  const esbuild = await import("esbuild");
  const result = await esbuild.build(buildOptions());
  return result.outputFiles
    .filter((f) => f.path.endsWith(".mjs"))
    .map((f) => ({ name: relative(join(SKILL_DIR, "dist"), f.path).replace(/\\/g, "/"), path: f.path, text: f.text }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  const files = await bundle();
  rmSync(join(SKILL_DIR, "dist", "chunks"), { recursive: true, force: true });
  for (const file of files) {
    mkdirSync(dirname(file.path), { recursive: true });
    writeFileSync(file.path, file.text);
    console.log(`built ${relative(SKILL_DIR, file.path).replace(/\\/g, "/")}  ${(Buffer.byteLength(file.text) / 1024).toFixed(0)} KiB`);
  }
}
