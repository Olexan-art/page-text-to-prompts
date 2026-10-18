// The report: one self-contained HTML page in the look of the Vectorscope skill's report.
// Everything is rendered here; the page's own script only switches the theme, copies prompts,
// opens and closes blocks, shows the skeleton hints and the "how this is counted" notes.

import { COPY, plural } from "./copy.mjs";
import { CHECK_IDS, FACT_VARIABLES } from "./checks.mjs";
import { measureBlock, measureLeaf } from "./measure.mjs";
import { CORNER, MOTANKA, ORNAMENT } from "./sprites.mjs";
import { escapeHtml as esc } from "./text.mjs";
import { VERSION } from "./version.mjs";

const GROUP = { hero: "hook", cta: "hook", lead_form: "hook", newsletter: "hook", social_proof_logos: "proof", testimonials: "proof", case_study: "proof", stats: "proof", guarantee: "proof", problem: "arg", solution: "arg", features: "arg", benefits: "arg", how_it_works: "arg", use_cases: "arg", comparison: "arg", about: "arg", team: "proof", pricing: "dec", faq: "dec" };
const FOOTER_LINKS = [
  { name: "GetLoopLoop", href: "https://www.getlooploop.com", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 7.5a4.5 4.5 0 1 0 0 9c2.4 0 3.4-1.9 4.5-4.5s2.1-4.5 4.5-4.5a4.5 4.5 0 1 1 0 9c-2.4 0-3.4-1.9-4.5-4.5S9.9 7.5 7.5 7.5z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>' },
  { name: "X", href: "https://x.com/Looploopnow", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>' },
  { name: "Bluesky", href: "https://bsky.app/profile/getlooploop.bsky.social", icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5.2 3.3C8 5.4 11 9.6 12 11.8c1-2.2 4-6.4 6.8-8.5 2-1.5 5.2-2.6 5.2 1 0 .7-.4 6-.6 6.9-.8 3-3.8 3.7-6.5 3.3 4.7.8 5.9 3.4 3.3 6.1-4.9 5-7-1.3-7.6-2.9l-.6-1.7-.6 1.7c-.6 1.6-2.7 7.9-7.6 2.9-2.6-2.7-1.4-5.3 3.3-6.1-2.7.4-5.7-.3-6.5-3.3C.4 10.3 0 5 0 4.3c0-3.6 3.2-2.5 5.2-1z"/></svg>' },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/olexandr-tsyrkin-07460539", author: true, icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>' },
];

const CSS = `
:root{--bg:#f3f6fa;--bg-2:#eaf0f6;--panel:#fff;--panel-2:#f6f9fc;--line:#c3d0df;--line-soft:#d6dfea;--control:#6b7c91;--ink:#0b1626;--ink-2:#2c3c51;--muted:#46566b;--faint:#56677c;--accent:#0b6a85;--accent-ink:#fff;--accent-soft:rgba(11,106,133,.09);--amber:#9a4a06;--pink:#be185d;--violet:#6d28d9;--green:#047857;--deco:.2;--deco-filter:none;--deco-mark:.5;--sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--mono:ui-monospace,"SF Mono","Cascadia Mono",Menlo,Consolas,monospace;color-scheme:light}
:root[data-theme="dark"]{--bg:#060b14;--bg-2:#08101d;--panel:#0a1424;--panel-2:#0d1a2e;--line:#24395a;--line-soft:#1b2b42;--control:#6b7f9b;--ink:#e6eef8;--ink-2:#c3d0de;--muted:#a3b3c7;--faint:#8b9cb2;--accent:#22d3ee;--accent-ink:#04121a;--accent-soft:rgba(34,211,238,.12);--amber:#f5a524;--pink:#f472b6;--violet:#a78bfa;--green:#34d399;--deco:.15;--deco-filter:brightness(2.6) saturate(.55);--deco-mark:.42;color-scheme:dark}
:root:not([data-lang="uk"]) .l-uk{display:none!important}:root[data-lang="uk"] .l-en{display:none!important}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 var(--sans);overflow-wrap:anywhere}a{color:var(--accent)}button{font:inherit;color:inherit}:focus-visible{outline:3px solid var(--accent);outline-offset:2px;border-radius:4px}code{font-family:var(--mono);font-size:.9em}
.wrap{position:relative;max-width:1120px;margin:0 auto;padding:28px 16px 32px}
.deco{height:26px;margin:10px 0 2px;background:url("${ORNAMENT}") center/contain no-repeat;opacity:var(--deco);filter:var(--deco-filter);pointer-events:none}.deco--foot{margin:30px 0 -14px}
.corner{position:absolute;width:132px;height:134px;background:url("${CORNER}") center/contain no-repeat;opacity:var(--deco);filter:var(--deco-filter);pointer-events:none}.corner--br{right:0;bottom:0}.corner--tl{left:0;top:0;transform:rotate(180deg)}@media (max-width:640px){.corner{display:none}}
.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px}.eyebrow{font-family:var(--mono);font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}
.toggles{display:flex;flex-wrap:wrap;gap:10px}.seg{display:flex;gap:2px;border:1px solid var(--line);border-radius:12px;padding:3px;background:var(--bg-2)}.seg button{border:1px solid transparent;background:none;border-radius:9px;padding:6px 14px;font-size:14px;color:var(--muted);cursor:pointer}.seg button[aria-pressed="true"]{border-color:var(--line);background:var(--panel-2);color:var(--ink)}
h1{margin:26px 0 6px;font-size:clamp(30px,4.4vw,54px);font-weight:800;line-height:1.05;letter-spacing:-.03em;text-wrap:balance}.url{font-family:var(--mono);font-size:15px}
.pills{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}.pill{position:relative;display:inline-flex;align-items:center;gap:9px;border:1px solid var(--line);border-radius:999px;padding:7px 12px 7px 14px;font-family:var(--mono);font-size:13px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-2)}.pill b{color:var(--ink);font-variant-numeric:tabular-nums}
.tag{--tone:var(--accent);display:inline-flex;align-items:center;gap:5px;border:1px solid color-mix(in srgb,var(--tone) 75%,transparent);border-radius:999px;padding:0 8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--tone);white-space:nowrap;line-height:19px}.tag::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--tone)}.td{--tone:var(--violet)}.ta{--tone:var(--pink)}
.q{position:relative;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:1px solid var(--line);border-radius:50%;background:none;font-family:var(--mono);font-size:11px;color:var(--ink-2);cursor:pointer}.q:hover{border-color:var(--accent)}
.pop{position:absolute;z-index:20;top:calc(100% + 8px);left:-10px;width:min(360px,80vw);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;background:var(--panel);padding:14px 16px;box-shadow:0 12px 32px rgba(0,0,0,.25);text-align:left;font:13.5px/1.5 var(--sans);color:var(--ink);text-transform:none;letter-spacing:0}.pop b{display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:14.5px}.pop dl{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;margin:0}.pop dt{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}.pop dd{margin:0;color:var(--ink-2)}
.info{display:grid;grid-template-columns:24px minmax(0,1fr);gap:4px 16px;margin-top:26px;border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:14px;background:var(--panel);padding:22px 26px}.info>svg{width:22px;height:22px;color:var(--accent)}.info h3{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:0;font-size:16.5px}.info p{margin:2px 0 14px;color:var(--ink-2)}.info p:last-child{margin-bottom:0}
.panel{margin-top:26px;border:1px solid var(--line-soft);border-radius:18px;background:linear-gradient(180deg,var(--panel),var(--bg-2));padding:24px 26px}@media (max-width:640px){.panel,.info{padding:18px 16px}}
.ph{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin-bottom:18px}.ph h2{margin:0;font-size:24px;letter-spacing:-.01em}.ph .lbl{font-family:var(--mono);font-size:14px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.ph .cap{margin-left:auto;font-size:14px;color:var(--muted);text-align:right}@media (max-width:760px){.ph .cap{margin-left:0;text-align:left;flex-basis:100%}}
.chips{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.chip{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--line-soft);border-radius:10px;background:var(--panel-2);padding:9px 16px;font-size:16px;font-weight:600}.chip svg{width:17px;height:17px;color:var(--accent)}.chip span{font-weight:400;color:var(--muted);font-size:15px}.chips i{font-style:normal;color:var(--faint)}
.sub{margin:18px 0 16px;border-top:1px solid var(--line-soft);padding-top:14px;font-size:14px;color:var(--muted)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.tile{position:relative;border:1px solid var(--line-soft);border-radius:12px;background:var(--panel-2);padding:18px 20px}.tile .big{font-size:34px;font-weight:800;line-height:1.05;font-variant-numeric:tabular-nums}.tile .big small{font-size:18px}.tile p{margin:8px 0 10px;font-size:14px;line-height:1.45;color:var(--muted)}.tile.hot{border-color:var(--amber);background:color-mix(in srgb,var(--amber) 7%,var(--panel-2))}.tile.hot .big{color:var(--amber)}.tile.good .big{color:var(--green)}.meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px}
.strip{display:flex;gap:4px;border:1px solid var(--line);border-radius:10px;padding:8px;background:var(--bg-2);overflow-x:auto}.cell{flex:var(--f) 0 44px;min-width:44px;height:64px;border:0;border-radius:5px;background:var(--tone);cursor:pointer;display:flex;align-items:flex-end;padding:5px 6px;font:700 11px var(--mono);color:var(--accent-ink);opacity:.92}.cell.col{background:repeating-linear-gradient(135deg,var(--tone) 0 7px,color-mix(in srgb,var(--tone) 55%,transparent) 7px 12px)}.cell:hover,.cell:focus-visible,.cell.on{opacity:1;box-shadow:0 0 0 2px var(--ink)}
.g-hook{--tone:var(--accent)}.g-arg{--tone:var(--violet)}.g-proof{--tone:var(--green)}.g-dec{--tone:var(--amber)}.g-other{--tone:var(--control)}
.hint{margin-top:12px;border:1px solid var(--line-soft);border-radius:10px;background:var(--panel-2);padding:12px 16px;font-size:14.5px;color:var(--ink-2);min-height:48px}.hint b{color:var(--ink)}
.legend{display:flex;flex-wrap:wrap;gap:8px 22px;margin-top:12px;font-size:14px;color:var(--ink-2)}.legend span{display:inline-flex;align-items:center;gap:8px}.legend i{width:12px;height:12px;border-radius:3px;background:var(--tone)}.legend i.col{background:repeating-linear-gradient(135deg,var(--muted) 0 3px,transparent 3px 6px)}
.vrow{display:grid;grid-template-columns:minmax(150px,1fr) minmax(0,1.4fr) 120px;gap:14px;align-items:center;padding:6px 0}@media (max-width:640px){.vrow{grid-template-columns:1fr 90px}.vrow .vbar{grid-column:1/-1;grid-row:2}}.vrow .nm code{color:var(--faint);margin-right:8px}.vbar{display:flex;gap:2px;height:10px;border-radius:5px;overflow:hidden}.vbar span{background:var(--tone)}.vrow .val{text-align:right;font-variant-numeric:tabular-nums;color:var(--ink-2);font-size:14px}.vrow .val small{display:block;color:var(--faint)}
.s-ok{--tone:var(--green)}.s-js{--tone:var(--amber)}.s-col{--tone:var(--violet)}.s-na{--tone:var(--pink)}
.vlead{margin:-6px 0 14px;font-size:15.5px;color:var(--amber)}.badge{display:inline-flex;align-items:center;border:1px solid color-mix(in srgb,var(--tone) 70%,transparent);border-radius:999px;padding:1px 9px;font-family:var(--mono);font-size:11.5px;color:var(--tone);background:color-mix(in srgb,var(--tone) 8%,transparent);white-space:nowrap}.fact-b{--tone:var(--amber)}
.out2{display:grid;gap:12px;margin-top:16px}@media (min-width:900px){.out2{grid-template-columns:repeat(2,minmax(0,1fr))}}.box{border:1px solid var(--line-soft);border-radius:12px;background:var(--panel-2);padding:14px 16px;min-width:0}.box h3{margin:0 0 8px;font:700 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}.box p{margin:0;font-size:14.5px;color:var(--ink-2)}.wide{grid-column:1/-1}
.kv{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:6px 14px;font-size:14px;color:var(--ink-2);margin:0}.kv dt{font-family:var(--mono);font-size:11.5px;color:var(--muted);text-transform:uppercase}.kv dd{margin:0}.kv .n{font-family:var(--mono);font-size:12px;color:var(--faint);white-space:nowrap}
.xl{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:7px;font-size:14px;color:var(--ink-2)}.xl li{display:flex;justify-content:space-between;gap:12px}.xl li span:last-child{color:var(--faint);font-family:var(--mono);font-size:12px;text-align:right}
.aware{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}.aware div{border-top:3px solid var(--line-soft);padding-top:8px;font-size:13px;line-height:1.35;color:var(--muted)}.aware div.on{border-top-color:var(--accent);color:var(--ink);font-weight:600}@media (max-width:560px){.aware{grid-template-columns:1fr}}
.threads{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:14.5px;color:var(--ink-2)}.tone-row{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:14px;color:var(--ink-2)}.tone-row b{color:var(--ink)}
.toolbar{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}.btn{display:inline-flex;align-items:center;min-height:32px;border:1px solid var(--line);border-radius:7px;background:none;padding:0 12px;font-size:13px;font-weight:600;cursor:pointer}.btn:hover{border-color:var(--accent)}
.blk{border:1px solid var(--line-soft);border-radius:14px;background:var(--panel-2);scroll-margin-top:16px}.blk+.blk{margin-top:14px}.blk summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:16px 20px}.blk summary::-webkit-details-marker{display:none}.caret{margin-left:auto;width:18px;height:18px;color:var(--accent);transition:transform .15s}.blk[open] .caret{transform:rotate(180deg)}
.nb{display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:32px;border-radius:8px;background:var(--accent);color:var(--accent-ink);font-weight:800;font-size:15px}.ctype{border:1px solid var(--line);border-radius:999px;padding:3px 12px;font:12.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--ink-2)}.srcs{font:12.5px var(--mono);color:var(--faint)}.bname{font-size:17px;font-weight:700}
.bbody{border-top:1px solid var(--line-soft);padding:16px 20px 20px;display:flex;flex-direction:column;gap:16px}.role{display:grid;grid-template-columns:90px minmax(0,1fr);gap:4px 14px;margin:0;font-size:15.5px}.role dt{font:12px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding-top:3px}.role dd{margin:0}.note{margin:0;font-size:13.5px}.note.col{color:var(--violet)}.note.js{color:var(--amber)}
.anat{display:grid;gap:16px}@media (min-width:1000px){.anat{grid-template-columns:minmax(0,1.25fr) minmax(0,1fr)}}.label{display:flex;align-items:center;gap:8px;margin:0 0 8px;font:700 11.5px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.struct{border:1px solid var(--line-soft);border-radius:10px;background:var(--bg-2)}.row{display:grid;grid-template-columns:150px minmax(0,1fr) 170px;gap:4px 14px;align-items:center;padding:9px 12px}.row+.row{border-top:1px solid var(--line-soft)}.row.child{padding-left:30px;grid-template-columns:132px minmax(0,1fr) 170px}.row.group .el{color:var(--accent)}.row .el{font-size:13.5px;font-weight:600}.row .el code{font-weight:400;color:var(--faint);margin-left:6px;font-size:11px}
.track{position:relative;height:8px;border-radius:4px;background:var(--line-soft)}.track i{position:absolute;top:0;bottom:0;border-radius:4px;background:color-mix(in srgb,var(--accent) 55%,transparent)}.track b{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:2px solid var(--panel-2);background:var(--green)}.track b.warn{background:var(--amber)}
.row .vol{font:12px var(--mono);color:var(--ink-2);text-align:right;font-variant-numeric:tabular-nums}.row .must{grid-column:1/-1;font-size:13px;line-height:1.45;color:var(--muted)}.row .must .f{color:var(--amber)}@media (max-width:640px){.row,.row.child{grid-template-columns:1fr auto}.row .track{grid-column:1/-1;grid-row:2}}
.tech{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px}.tech li{display:flex;gap:10px;font-size:14px;line-height:1.55;color:var(--ink-2)}.tech li::before{content:"";flex:0 0 6px;height:6px;margin-top:8px;border-radius:50%;background:var(--accent)}
.avoid{display:flex;flex-wrap:wrap;gap:6px}.avoid span{border:1px dashed var(--line);border-radius:999px;padding:2px 10px;font-size:12.5px;color:var(--muted);text-decoration:line-through;text-decoration-color:var(--pink)}
.pair{display:grid;gap:12px}@media (min-width:1000px){.pair{grid-template-columns:minmax(0,1fr) 24px minmax(0,1fr)}}.pair .arr{display:none;align-self:center;color:var(--faint);text-align:center}@media (min-width:1000px){.pair .arr{display:block}}
.pbox{--tone:var(--accent);border:1px solid color-mix(in srgb,var(--tone) 70%,transparent);border-radius:12px;background:color-mix(in srgb,var(--tone) 6%,var(--panel-2));padding:14px 16px;min-width:0;display:flex;flex-direction:column;gap:10px}.pbox.ex{--tone:var(--green)}.pbox-h{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}.pbox-h h4{margin:0;font:700 13px var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--tone)}
.pbox pre{margin:0;max-height:460px;overflow:auto;font:12.8px/1.6 var(--mono);color:var(--ink);white-space:pre-wrap}.v{color:var(--accent)}.vf{color:var(--amber)}
.exs{display:flex;flex-direction:column;gap:12px}.mt{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:2px;font:10.5px var(--mono);letter-spacing:.04em;color:var(--muted)}.mt .ok{color:var(--green)}.mt .warn{color:var(--amber)}.mf{border:1px dashed var(--amber);border-radius:6px;padding:4px 8px}.mf .fs{color:var(--amber)}
.e-eyebrow{font:700 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--accent)}.e-h1{font-size:24px;font-weight:800;line-height:1.12}.e-h2{font-size:20px;font-weight:750;line-height:1.18}.e-h3{font-size:15.5px;font-weight:700}.e-text{font-size:14.5px;line-height:1.5;color:var(--ink-2)}.e-quote{font-size:14.5px;font-style:italic}.e-small{font-size:13px;color:var(--muted)}.e-btn{display:inline-flex;align-items:center;min-height:34px;border-radius:6px;background:var(--accent);color:var(--accent-ink);padding:0 14px;font-weight:700;font-size:14px}.e-link{color:var(--accent);font-weight:600}.e-price{font-size:20px;font-weight:800}.e-list{margin:0;padding-left:18px;font-size:13.5px;color:var(--ink-2)}
.grp{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}.grp>.card{border:1px solid var(--line-soft);border-radius:9px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;background:var(--panel)}
.exfoot{display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;border-top:1px solid color-mix(in srgb,var(--green) 40%,transparent);padding-top:8px;font:11.5px var(--mono);color:var(--muted)}.exfoot b{color:var(--green)}
.checks{margin:0;padding:0;list-style:none;display:grid;gap:8px}@media (min-width:900px){.checks{grid-template-columns:repeat(2,minmax(0,1fr))}}.checks li{display:grid;grid-template-columns:24px minmax(0,1fr);gap:2px 10px;border:1px solid var(--line-soft);border-radius:10px;background:var(--panel-2);padding:11px 14px}.checks svg{width:20px;height:20px;color:var(--green);grid-row:span 2}.checks b code{font-weight:400;color:var(--faint);margin-left:6px}.checks span{font-size:13.5px;color:var(--muted)}
.tbl{overflow-x:auto;border:1px solid var(--line-soft);border-radius:10px}table{width:100%;border-collapse:collapse;font-size:14px;color:var(--ink-2)}th,td{border-bottom:1px solid var(--line-soft);padding:9px 12px;text-align:left;vertical-align:top}thead th{background:var(--panel-2);font:600 11px var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}tbody th{font:600 13px var(--mono);color:var(--ink)}tbody tr:last-child>*{border-bottom:0}.path{display:flex;flex-wrap:wrap;gap:4px}.path a{font:11.5px var(--mono);border-radius:4px;padding:1px 7px;background:var(--accent-soft);color:var(--accent);text-decoration:none}
.files{display:flex;flex-wrap:wrap;gap:10px}.file{display:inline-flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:10px 14px;font:13px var(--mono)}.file span{color:var(--muted);font-family:var(--sans)}
.motanka{width:30px;height:auto;opacity:var(--deco-mark);filter:var(--deco-filter);flex:none}.foot-made{display:flex;align-items:center;gap:12px;max-width:600px}.foot{position:relative;z-index:1;margin-top:28px;border-top:1px solid var(--line-soft);padding:18px 0 4px;color:var(--muted);font-size:14px;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px 24px;align-items:center}.foot p{margin:0}.links{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}.links a{display:inline-flex;align-items:center;gap:7px;color:var(--ink);text-decoration:none;border:1px solid var(--control);border-radius:999px;padding:6px 13px 6px 10px;background:var(--panel);font-size:14px}.links a:hover{border-color:var(--accent)}.links svg{width:15px;height:15px}
`;

const JS = `
(function(){
var root=document.documentElement;
function sync(){var d=root.getAttribute("data-theme")==="dark";document.querySelectorAll("[data-set-theme]").forEach(function(b){b.setAttribute("aria-pressed",String((b.dataset.setTheme==="dark")===d))})}
document.querySelectorAll("[data-set-theme]").forEach(function(b){b.addEventListener("click",function(){root.setAttribute("data-theme",b.dataset.setTheme);sync()})});
function setLang(l){root.setAttribute("data-lang",l);root.setAttribute("lang",l);document.querySelectorAll("[data-set-lang]").forEach(function(b){b.setAttribute("aria-pressed",String(b.dataset.setLang===l))})}
document.querySelectorAll("[data-set-lang]").forEach(function(b){b.addEventListener("click",function(){setLang(b.dataset.setLang)})});
var h=location.hash;setLang(/lang=uk/.test(h)?"uk":"en");if(/theme=dark/.test(h))root.setAttribute("data-theme","dark");sync();
var C=JSON.parse(document.getElementById("ptp-data").textContent);
function cur(){return root.getAttribute("data-lang")==="uk"?"uk":"en"}
function copy(text,btn){var o=btn.innerHTML;function done(t){btn.textContent=t;setTimeout(function(){btn.innerHTML=o},1500)}
try{navigator.clipboard.writeText(text).then(function(){done(C.copied[cur()])},function(){done(C.copyFailed[cur()])})}catch(e){done(C.copyFailed[cur()])}}
document.addEventListener("click",function(e){var b=e.target.closest("[data-copy]");if(b){e.preventDefault();copy(C.prompts[+b.dataset.copy],b)}});
var all=document.getElementById("copyAll");if(all)all.addEventListener("click",function(){copy(C.all,all)});
var oa=document.getElementById("openAll"),ca=document.getElementById("closeAll");
if(oa)oa.addEventListener("click",function(){document.querySelectorAll(".blk").forEach(function(d){d.open=true})});
if(ca)ca.addEventListener("click",function(){document.querySelectorAll(".blk").forEach(function(d){d.open=false})});
var strip=document.getElementById("strip"),hint=document.getElementById("hint");
function show(c){if(!c)return;hint.innerHTML=c.querySelector("template").innerHTML;[].forEach.call(strip.querySelectorAll(".cell"),function(x){x.classList.toggle("on",x===c)})}
if(strip){strip.addEventListener("mouseover",function(e){show(e.target.closest(".cell"))});strip.addEventListener("focusin",function(e){show(e.target.closest(".cell"))});
strip.addEventListener("click",function(e){var c=e.target.closest(".cell");if(!c)return;var d=document.getElementById(c.dataset.target);if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})}})}
var open=null;function close(){if(open){open.hidden=true;open=null}}
document.addEventListener("click",function(e){var q=e.target.closest(".q");if(!q){if(!e.target.closest(".pop"))close();return}
var p=q.querySelector(".pop");var was=open===p;close();if(!was&&p){p.hidden=false;open=p;var r=p.getBoundingClientRect();if(r.right>innerWidth-12){p.style.left="auto";p.style.right="-10px"}}});
document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});
})();`;

const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const CIRCLE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>';
const CARET = '<svg class="caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>';

/** Variables in a string, coloured: facts amber, the rest the accent. */
function vars(text) {
  return esc(text).replace(/\{([a-z][a-z0-9_]*)\}/g, (_, v) => `<span class="${FACT_VARIABLES.includes(v) ? "vf" : "v"}">{${v}}</span>`);
}

const LANGS = ["en", "uk"];

/**
 * The frame's words in both languages at once; the page shows one and hides the other, English by
 * default. `pick(L, lang)` returns plain text (escaped here) or, with raw, ready HTML.
 */
function both(pick, raw = false) {
  return LANGS.map((lang) => `<span class="l-${lang}"${lang === "uk" ? ' lang="uk"' : ""}>${raw ? pick(COPY[lang], lang) : esc(pick(COPY[lang], lang))}</span>`).join("");
}
const t = (key) => both((L) => L[key]);
const rng = (r, forms, lang) => `${r[0] === r[1] ? r[0] : `${r[0]}–${r[1]}`} ${plural(r[1], forms, lang)}`;

export function renderReport({ page, analysis }) {
  const tag = (kind) => `<span class="tag ${kind === "derived" ? "td" : kind === "judgement" ? "ta" : ""}">${t(kind)}</span>`;
  const help = (id) => {
    const pop = LANGS.map((lang) => {
      const [title, kind, rows] = COPY[lang].help[id];
      return `<span class="l-${lang}"><b>${esc(title)} <span class="tag ${kind === "derived" ? "td" : kind === "judgement" ? "ta" : ""}">${esc(COPY[lang][kind])}</span></b><dl>${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></span>`;
    }).join("");
    return `<button class="q" type="button" aria-label="${esc(COPY.en.howCounted)}">?<span class="pop" role="dialog" hidden>${pop}</span></button>`;
  };
  const pct = (x) => Math.round(x * 100);

  const vis = page.visibility;
  const blocks = analysis.blocks;
  const measured = blocks.map((b) => measureBlock(b));
  const leafCount = measured.reduce((n, m) => n + m.leaves.length, 0);
  const fitCount = measured.reduce((n, m) => n + m.leaves.filter((l) => l.m.verdict !== "out").length, 0);
  const candidates = page.blocks.length;
  const pageById = new Map(page.blocks.map((b) => [b.id, b]));
  const statusOf = (b) => {
    const s = { ok: 0, js_only: 0, collapsed: 0, not_in_a11y: 0 };
    for (const id of b.source_blocks || []) {
      const pb = pageById.get(id);
      if (pb) for (const k of Object.keys(s)) s[k] += pb.statusWords[k] || 0;
    }
    return s;
  };
  const statusWords = blocks.map(statusOf);
  const total = (s) => s.ok + s.js_only + s.collapsed + s.not_in_a11y;
  const title = page.page.title || page.page.url || "Page";
  const out = [];

  out.push(`<!doctype html><html lang="en" data-lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`);
  out.push(`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:">`);
  out.push(`<title>${esc(title)} · page-text-to-prompts</title><style>${CSS}</style></head><body><main class="wrap">`);

  // Header: the language and theme switches.
  out.push(`<div class="top"><span class="eyebrow">${t("eyebrow")}</span><div class="toggles"><div class="seg" role="group" aria-label="${esc(COPY.en.langGroup)}"><button type="button" data-set-lang="en" aria-pressed="true">EN</button><button type="button" data-set-lang="uk" aria-pressed="false" lang="uk">UK</button></div><div class="seg" role="group" aria-label="${esc(COPY.en.themeGroup)}"><button type="button" data-set-theme="dark" aria-pressed="false">${t("dark")}</button><button type="button" data-set-theme="light" aria-pressed="true">${t("light")}</button></div></div></div>`);
  out.push('<div class="deco" aria-hidden="true"></div><div class="corner corner--tl" aria-hidden="true"></div>');
  out.push(`<h1>${esc(title)}</h1>`);
  if (page.page.url) out.push(`<a class="url" href="${esc(page.page.url)}" rel="noopener noreferrer" target="_blank">${esc(page.page.url)}</a>`);
  out.push(`<div class="pills"><span class="pill"><b>${vis.totalWords}</b> ${t("words")} ${tag("measured")}${help("words")}</span><span class="pill"><b>${blocks.length}</b> ${t("blocks")} ${tag("judgement")}${help("blocks")}</span><span class="pill">${t("lang")} <b>${esc(page.page.lang || "—")}</b> ${tag("measured")}</span><span class="pill">${t("render")} <b>${t(page.page.rendered ? "yes" : "no")}</b> ${tag("measured")}</span></div>`);

  // Provenance
  out.push(`<section class="info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7.5v.01"/></svg><div><h3>${t("infoSame")} ${tag("measured")}${tag("derived")}</h3><p>${t("infoSameBody")}</p><h3>${t("infoJudge")} ${tag("judgement")}</h3><p>${t("infoJudgeBody")}</p><h3>${t("infoForm")}</h3><p>${t("infoFormBody")}</p></div></section>`);

  // Result
  const chip = (label, sub) => `<span class="chip">${CHECK_SVG}${label}${sub ? ` <span>${sub}</span>` : ""}</span>`;
  const chips = [
    chip(t("chipFetched")),
    page.page.rendered ? chip(t("chipLayers"), "html · render · a11y") : chip(t("chipHtmlOnly")),
    chip(t("chipBlocks"), both((L) => `${blocks.length} ${L.chipOf} ${candidates} ${L.chipCandidates}`)),
    chip(t("chipPrompts"), String(blocks.length)),
    chip(t("chipChecks"), both((L) => `${CHECK_IDS.length} ${L.chipOf} ${CHECK_IDS.length}`)),
  ];
  out.push(`<section class="panel"><div class="ph"><span class="lbl">${t("result")}</span>${tag("measured")}${tag("judgement")}<span class="cap">${t("resultCap")}</span></div><div class="chips">${chips.join("<i>→</i>")}</div>`);
  out.push(`<p class="sub">${both((L) => `${candidates} ${L.subCandidates} · ${(analysis.dropped || []).length} ${L.subDropped} · ${leafCount} ${L.subElements}`)}</p>`);
  const js = pct(vis.jsOnlyShare);
  out.push(`<div class="tiles"><div class="tile"><div class="big">${blocks.length}</div><p>${t("tileBlocks")}</p><div class="meta">${tag("judgement")}${help("blocks")}</div></div><div class="tile${js > 10 ? " hot" : ""}"><div class="big">${js}<small>%</small></div><p>${t("tileJs")}</p><div class="meta">${tag("measured")}${help("js")}</div></div><div class="tile"><div class="big">${pct(vis.collapsedShare)}<small>%</small></div><p>${t("tileCollapsed")}</p><div class="meta">${tag("measured")}${help("col")}</div></div><div class="tile good"><div class="big">${fitCount}<small>/${leafCount}</small></div><p>${t("tileFit")}</p><div class="meta">${tag("derived")}${help("fit")}</div></div><div class="tile good"><div class="big">0</div><p>${t("tileOverlap")}</p><div class="meta">${tag("derived")}${help("overlap")}</div></div></div></section>`);

  // Skeleton
  const cells = blocks.map((b, i) => {
    const s = statusWords[i];
    const g = GROUP[b.block_type] || "other";
    const n = String(i + 1).padStart(2, "0");
    const hintHtml = `<b>${n} · ${esc(b.name)}</b> <code>${esc(b.block_type)}</code> · ${total(s)} ${t("words")}<br>${esc(b.role)}`;
    return `<button type="button" class="cell g-${g}${s.collapsed ? " col" : ""}" style="--f:${Math.max(1, total(s))}" data-target="${esc(b.id)}" aria-label="${esc(b.name)}">${n}<template>${hintHtml}</template></button>`;
  });
  out.push(`<section class="panel"><div class="ph"><h2>${t("skeleton")}</h2>${tag("measured")}${tag("judgement")}<span class="cap">${t("skeletonCap")}</span></div><div class="strip" id="strip">${cells.join("")}</div><div class="hint" id="hint">${t("hint")}</div><div class="legend"><span class="g-hook"><i></i>${t("gHook")}</span><span class="g-arg"><i></i>${t("gArg")}</span><span class="g-proof"><i></i>${t("gProof")}</span><span class="g-dec"><i></i>${t("gDec")}</span><span class="g-other"><i></i>${t("gOther")}</span><span><i class="col"></i>${t("gFolded")}</span></div></section>`);

  // Who sees what
  const max = Math.max(1, ...statusWords.map(total));
  const rows = blocks.map((b, i) => {
    const s = statusWords[i];
    const seg = (k, cls) => (s[k] ? `<span class="${cls}" style="width:${(s[k] / max) * 100}%"></span>` : "");
    const note = s.js_only ? "js_only" : s.collapsed ? `${s.collapsed} collapsed` : s.not_in_a11y ? `${s.not_in_a11y} not_in_a11y` : "";
    return `<div class="vrow"><span class="nm"><code>${String(i + 1).padStart(2, "0")}</code>${esc(b.name)}</span><span class="vbar">${seg("ok", "s-ok")}${seg("js_only", "s-js")}${seg("collapsed", "s-col")}${seg("not_in_a11y", "s-na")}</span><span class="val">${total(s)} ${t("wordsShort")}<small>${esc(note)}</small></span></div>`;
  });
  const foldedBlocks = statusWords.filter((s) => s.js_only || s.collapsed).length;
  const f = page.page;
  const field = (k, v) => (v ? `<dt>${k}</dt><dd>${esc(v)}</dd><span class="n">${[...v].length}</span>` : "");
  const excl = page.excluded.map((e) => `<li><span>${both((L) => L.reasons[e.reason] || e.reason)}</span><span>${e.words} ${t("wordsShort")}</span></li>`).join("");
  const lead = page.page.rendered ? both((L) => L.whoLead(js, foldedBlocks)) : t("whoLeadHtml");
  out.push(`<section class="panel"><div class="ph"><h2>${t("who")}</h2>${tag("measured")}<span class="cap">${t("whoCap")}</span></div><p class="vlead">${lead}</p>${rows.join("")}<div class="legend"><span class="s-ok"><i></i>${t("sOk")}</span><span class="s-js"><i></i>${t("sJs")}</span><span class="s-col"><i></i>${t("sCol")}</span><span class="s-na"><i></i>${t("sNa")}</span></div>`);
  out.push(`<div class="out2"><div class="box"><h3>${t("outside")}</h3><dl class="kv">${field("title", f.title)}${field("meta", f.metaDescription)}${field("og", f.og?.title && f.og.title !== f.title ? f.og.title : null)}</dl></div><div class="box"><h3>${t("notAnalysed")}</h3><ul class="xl">${excl}<li><span><code>a11y_only</code></span><span>${vis.a11yOnly.count} · ${t("a11yOnly")}</span></li><li><span><code>hidden</code></span><span>${vis.hidden.count} · ${t("hidden")}</span></li></ul></div></div></section>`);

  // Profile (the agent's words stay in the language the agent wrote them in)
  const p = analysis.profile;
  const tone = p.tone || {};
  out.push(`<section class="panel"><div class="ph"><h2>${t("profile")}</h2>${tag("judgement")}<span class="cap">${t("profileCap")}</span></div><div class="out2" style="margin-top:0">`);
  out.push(`<div class="box"><h3>${t("pType")}</h3><p>${esc(p.page_type)}. ${esc(p.audience)}</p></div>`);
  out.push(`<div class="box"><h3>${t("pTone")}</h3><div class="tone-row"><span><b>${esc((tone.adjectives || []).join(", "))}</b></span>${tone.formality ? `<span>${both((L) => `${L.formality} ${tone.formality} ${L.of5}`)}</span>` : ""}${tone.address ? `<span>${t("address")}: ${esc(tone.address)}</span>` : ""}</div></div>`);
  out.push(`<div class="box wide"><h3>${t("pAware")}</h3><div class="aware">${["unaware", "problem_aware", "comparing_solutions", "product_aware", "ready_to_buy"].map((a) => `<div${a === p.awareness ? ' class="on"' : ""}>${both((L) => L.aware[a])}</div>`).join("")}</div></div>`);
  out.push(`<div class="box"><h3>${t("pPromise")}</h3><p>${vars(p.main_promise)}</p></div><div class="box"><h3>${t("pLogic")}</h3><p>${esc(p.persuasion_logic)}</p></div>`);
  if ((p.threads || []).length) out.push(`<div class="box wide"><h3>${t("pThreads")}</h3><ul class="threads">${p.threads.map((x) => `<li>${vars(x)}</li>`).join("")}</ul></div>`);
  out.push("</div></section>");

  // Blocks
  out.push(`<section class="panel"><div class="ph"><h2>${t("blocksTitle")}</h2>${tag("judgement")}${tag("derived")}<span class="cap">${t("blocksCap")}</span></div><div class="toolbar"><button class="btn" type="button" id="openAll">${t("openAll")}</button><button class="btn" type="button" id="closeAll">${t("closeAll")}</button><button class="btn" type="button" id="copyAll">${t("copyAll")}</button></div>`);
  blocks.forEach((b, i) => out.push(renderBlock(b, i, { measured: measured[i], status: statusWords[i], tag, total })));
  out.push("</section>");

  // Variables
  const where = new Map();
  blocks.forEach((b) => {
    const text = [b.prompt, ...(b.techniques || []), ...(b.structure || []).flatMap((e) => [e.must, ...(e.children || []).map((c) => c.must)])].join(" ");
    for (const m of text.matchAll(/\{([a-z][a-z0-9_]*)\}/g)) {
      if (!where.has(m[1])) where.set(m[1], new Set());
      where.get(m[1]).add(b);
    }
  });
  const varRows = Object.entries(analysis.variables || {}).map(([name, v]) => `<tr><th scope="row">{${esc(name)}}</th><td>${esc(v.means)}</td><td>${v.fact ? `<span class="badge fact-b">${t("fact")}</span>` : "—"}</td><td><div class="path">${[...(where.get(name) || [])].map((b) => `<a href="#${esc(b.id)}">${esc(b.block_type)}</a>`).join("")}</div></td></tr>`);
  out.push(`<section class="panel"><div class="ph"><h2>${t("vars")}</h2>${tag("derived")}<span class="cap">${t("varsCap")}</span></div><div class="tbl"><table><thead><tr><th scope="col">${t("vName")}</th><th scope="col">${t("vMeans")}</th><th scope="col">${t("vFact")}</th><th scope="col">${t("vWhere")}</th></tr></thead><tbody>${varRows.join("")}</tbody></table></div></section>`);

  // Checks and files
  out.push(`<section class="panel"><div class="ph"><h2>${t("checks")}</h2>${tag("derived")}<span class="cap">${both((L) => L.checksCap(CHECK_IDS.length))}</span></div><ul class="checks">${CHECK_IDS.map((id) => `<li>${CIRCLE_SVG}<b>${both((L) => L.check[id][0])}<code>${id}</code></b><span>${both((L) => L.check[id][1])}</span></li>`).join("")}</ul></section>`);
  out.push(`<section class="panel"><div class="ph"><h2>${t("files")}</h2><span class="cap">${t("filesCap")}</span></div><div class="files"><span class="file">page-prompts.md <span>${t("fileMd")}</span></span><span class="file">page-prompts.json <span>${t("fileJson")}</span></span><span class="file">page.json <span>${t("filePage")}</span></span></div></section>`);

  // Footer
  const links = FOOTER_LINKS.map((l) => `<li><a href="${l.href}" rel="noopener noreferrer" target="_blank">${l.icon}<span>${l.author ? `${esc(l.name)} · ${t("footerAuthor")}` : esc(l.name)}</span></a></li>`).join("");
  out.push(`<div class="deco deco--foot" aria-hidden="true"></div><footer class="foot"><div class="foot-made"><img class="motanka" src="${MOTANKA}" alt="" width="30" height="39"><p>${t("footer")} v${VERSION}</p></div><ul class="links">${links}</ul></footer><div class="corner corner--br" aria-hidden="true"></div>`);

  const data = {
    copied: { en: COPY.en.copied, uk: COPY.uk.copied },
    copyFailed: { en: COPY.en.copyFailed, uk: COPY.uk.copyFailed },
    prompts: blocks.map((b) => b.prompt),
    all: blocks.map((b, i) => `## ${String(i + 1).padStart(2, "0")}. ${b.name}\n\n${b.prompt}`).join("\n\n"),
  };
  out.push(`<script type="application/json" id="ptp-data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script><script>${JS}</script></main></body></html>`);
  return out.join("\n");
}

function renderBlock(b, i, { measured, status, tag, total }) {
  const n = i + 1;
  const scale = Math.ceil(Math.max(1, ...(b.structure || []).flatMap((e) => (e.children ? e.children.map((c) => c.words[1]) : [e.words[1]]))) * 1.25);
  const leaves = measured.leaves;
  const leafFor = (path) => leaves.find((l) => l.path === path);
  const vol = (spec) => both((L, lang) => (spec.items ? `${spec.items[0]}–${spec.items[1]} ${L.item} · ${L.each} ${rng(spec.words, L.w, lang)}` : `${rng(spec.words, L.w, lang)} · ${spec.chars[0]}–${spec.chars[1]}`));
  const row = (spec, child, path) => {
    const a = (spec.words[0] / scale) * 100;
    const w = Math.max(1.5, ((spec.words[1] - spec.words[0]) / scale) * 100);
    const leaf = leafFor(path);
    const dot = leaf ? `<b class="${leaf.m.verdict === "in" ? "" : "warn"}" style="left:${Math.min(98, (leaf.m.words / scale) * 100)}%"></b>` : "";
    return `<div class="row${child ? " child" : ""}"><span class="el">${esc(spec.label || spec.element)}<code>${esc(spec.element)}</code></span><span class="track"><i style="left:${a}%;width:${w}%"></i>${dot}</span><span class="vol">${vol(spec)}</span><span class="must">${spec.fact ? `<span class="f">${t("fact")} · </span>` : ""}${vars(spec.must || "")}</span></div>`;
  };
  const struct = (b.structure || [])
    .map((spec) => {
      if (spec.children) {
        return `<div class="row group"><span class="el">${spec.count} × ${esc(spec.label || spec.element)}</span><span></span><span class="vol">${spec.count} ${t("same")}</span></div>${spec.children.map((c) => row(c, true, `${b.id} › ${spec.element} 1 › ${c.element}`)).join("")}`;
      }
      return row(spec, false, `${b.id} › ${spec.element}`);
    })
    .join("");

  const markOf = (v) => (v === "in" ? `<span class="ok">✓ ${t("inRange")}</span>` : v === "near" ? `<span class="warn">≈ ${t("nearRange")}</span>` : `<span class="warn">⚠ ${t("outRange")}</span>`);
  const kind = (el) => {
    const e = String(el).toLowerCase();
    if (/eyebrow|kicker|overline/.test(e)) return "eyebrow";
    if (e === "h1") return "h1";
    if (e === "h2") return "h2";
    if (/^h[3-6]$|title|name|question/.test(e)) return "h3";
    if (/button|cta/.test(e)) return "btn";
    if (/link/.test(e)) return "link";
    if (/quote|testimonial/.test(e)) return "quote";
    if (/price/.test(e)) return "price";
    if (/small|note|risk|fine/.test(e)) return "small";
    return "text";
  };
  const exLeaf = (spec, value) => {
    const m = measureLeaf(spec, value);
    const meta = spec.items ? both((L) => `${m.count} ${L.item}`) : both((L) => `${m.words} ${L.wordsShort} · ${m.chars}`);
    const k = kind(spec.element);
    const body = spec.items ? `<ul class="e-list">${(value || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : k === "btn" ? `<span class="e-btn">${esc(value)}</span>` : k === "link" ? `<span class="e-link">${esc(value)} →</span>` : `<div class="e-${k}">${esc(value)}</div>`;
    return `<div class="m${spec.fact ? " mf" : ""}"><div class="mt">${esc(spec.label || spec.element)} · ${meta} ${markOf(m.verdict)}${spec.fact ? ` <span class="fs">${t("factSample")}</span>` : ""}</div>${body}</div>`;
  };
  const example = (b.structure || [])
    .map((spec, j) => {
      const ex = (b.example || [])[j] || {};
      if (spec.children) return `<div class="grp">${(ex.items || []).map((card) => `<div class="card">${spec.children.map((c, k) => exLeaf(c, c.items ? card?.[k]?.list : card?.[k]?.text)).join("")}</div>`).join("")}</div>`;
      return exLeaf(spec, spec.items ? ex.list : ex.text);
    })
    .join("");
  const fit = leaves.filter((l) => l.m.verdict !== "out").length;

  const src = (b.source_blocks || []).join(" + ");
  const badges = [status.ok ? '<span class="badge s-ok">ok</span>' : "", status.js_only ? '<span class="badge s-js">js_only</span>' : "", status.collapsed ? '<span class="badge s-col">collapsed</span>' : "", status.not_in_a11y ? '<span class="badge s-na">not_in_a11y</span>' : ""].join("");
  const tone = b.tone || {};
  return `<details class="blk" id="${esc(b.id)}"${i < 2 ? " open" : ""}><summary><span class="nb">${n}</span><span class="ctype">${esc(b.block_type)}</span><span class="bname">${esc(b.name)}</span><span class="srcs">${esc(src)} · ${total(status)} ${t("wordsShort")}</span>${badges}${CARET}</summary>
<div class="bbody"><dl class="role"><dt>${t("job")}</dt><dd>${esc(b.role)}</dd></dl>${status.collapsed ? `<p class="note col">${t("foldedNote")}</p>` : ""}${status.js_only ? `<p class="note js">${t("jsNote")}</p>` : ""}
<div class="anat"><div><p class="label">${t("structure")} ${tag("judgement")}</p><div class="struct">${struct}</div><p class="note" style="margin-top:6px;color:var(--faint);font-size:12.5px">${t("structNote")}</p></div>
<div style="display:flex;flex-direction:column;gap:14px;min-width:0"><div><p class="label">${t("techniques")}</p><ul class="tech">${(b.techniques || []).map((x) => `<li><span>${vars(x)}</span></li>`).join("")}</ul></div>
<div><p class="label">${t("tone")}</p><div class="tone-row"><span><b>${esc((tone.adjectives || []).join(", "))}</b></span>${tone.address ? `<span>${esc(tone.address)}</span>` : ""}</div></div>
${(b.avoids || []).length ? `<div><p class="label">${t("avoids")}</p><div class="avoid">${b.avoids.map((a) => `<span>${esc(a)}</span>`).join("")}</div></div>` : ""}</div></div>
<div class="pair"><div class="pbox"><div class="pbox-h"><h4>${t("prompt")}</h4><button class="btn" type="button" data-copy="${i}">${t("copy")}</button></div><pre>${vars(b.prompt)}</pre>${b.filled_prompt ? `<h4 style="margin:6px 0 0;font:700 12px var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--accent)">${t("filled")}</h4><pre>${esc(b.filled_prompt)}</pre>` : ""}</div><div class="arr" aria-hidden="true">→</div>
<div class="pbox ex"><div class="pbox-h"><h4>${t("example")}</h4><span class="mt">${t("fictional")}</span></div><div class="exs">${example}</div><div class="exfoot"><span>${both((L) => L.fitOf(fit, leaves.length))}</span><span><b>${t("noOverlap")}</b></span></div></div></div></div></details>`;
}
