// The local browser, driven over the DevTools protocol with Node's own WebSocket.
// No browser is downloaded: Chrome, Chromium or Edge already on the machine is used, always with a
// fresh, throwaway profile, so no cookie, login or extension of the user's is ever involved.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

export const VIEWPORT = { width: 1440, height: 900 };
export const LAUNCH_TIMEOUT_MS = 15_000;
export const COMMAND_TIMEOUT_MS = 30_000;

const COMMON_PATHS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Google/Chrome Dev/Application/chrome.exe",
  "C:/Program Files/Google/Chrome Beta/Application/chrome.exe",
  "C:/Program Files/Chromium/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];
const PATH_NAMES = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome", "microsoft-edge", "microsoft-edge-stable"];

/** The browser to use: CHROME_PATH, then the usual install paths, then PATH. Null when none. */
export function findBrowser(env = process.env) {
  if (env.CHROME_PATH && existsSync(env.CHROME_PATH)) return env.CHROME_PATH;
  const local = env.LOCALAPPDATA ? [join(env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"), join(env.LOCALAPPDATA, "Chromium/Application/chrome.exe")] : [];
  for (const candidate of [...COMMON_PATHS, ...local]) if (existsSync(candidate)) return candidate;
  for (const dir of String(env.PATH || "").split(delimiter)) {
    for (const name of PATH_NAMES) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One DevTools session over a WebSocket: send() resolves with the result, on() subscribes to events. */
class Session {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (event) => {
      const msg = JSON.parse(typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8"));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject, timer } = this.pending.get(msg.id);
        clearTimeout(timer);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const fn of this.listeners.get(msg.method) || []) fn(msg.params);
      }
    });
  }

  send(method, params = {}, timeoutMs = COMMAND_TIMEOUT_MS) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  /** Evaluate an expression in the page and return its value; a thrown page error becomes a rejection. */
  async evaluate(expression, timeoutMs = COMMAND_TIMEOUT_MS) {
    const result = await this.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, timeoutMs);
    if (result.exceptionDetails) {
      const text = result.exceptionDetails.exception?.description || result.exceptionDetails.text;
      throw new Error(`page script failed: ${text}`);
    }
    return result.result.value;
  }
}

/**
 * Start the browser headless on a free debugging port and open a session on its first tab.
 * Returns { session, close } or throws with a short reason: no_browser | launch_failed.
 */
export async function openBrowser(browser = findBrowser()) {
  if (!browser) throw Object.assign(new Error("no_browser"), { reason: "no_browser" });
  if (typeof globalThis.WebSocket !== "function") throw Object.assign(new Error("Node 22 or later is needed for rendering"), { reason: "node_too_old" });

  const profile = mkdtempSync(join(tmpdir(), "page-text-to-prompts-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--disable-background-networking",
    "--disable-sync",
    "--mute-audio",
    "--hide-scrollbars",
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ];
  const child = spawn(browser, args, { stdio: "ignore", windowsHide: true });
  let exited = false;
  child.on("exit", () => {
    exited = true;
  });

  const cleanup = async () => {
    try {
      child.kill();
    } catch {
      // already gone
    }
    for (let i = 0; i < 20 && !exited; i += 1) await sleep(100);
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      // A profile the browser still holds is left for the OS to clean.
    }
  };

  try {
    // Chrome writes the port it picked into the profile once it listens.
    const portFile = join(profile, "DevToolsActivePort");
    const started = Date.now();
    while (!existsSync(portFile)) {
      if (exited || Date.now() - started > LAUNCH_TIMEOUT_MS) throw new Error("launch_failed");
      await sleep(100);
    }
    let port = "";
    while (!port && Date.now() - started < LAUNCH_TIMEOUT_MS) {
      port = readFileSync(portFile, "utf8").split(/\r?\n/)[0].trim();
      if (!port) await sleep(50);
    }
    const list = await (await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(5_000) })).json();
    const tab = list.find((t) => t.type === "page");
    if (!tab) throw new Error("launch_failed");

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("launch_failed")), 5_000);
      ws.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      ws.addEventListener("error", () => { clearTimeout(timer); reject(new Error("launch_failed")); }, { once: true });
    });
    const session = new Session(ws);
    return {
      session,
      browser,
      close: async () => {
        try {
          ws.close();
        } catch {
          // ignore
        }
        await cleanup();
      },
    };
  } catch (error) {
    await cleanup();
    throw Object.assign(new Error(error.message), { reason: "launch_failed" });
  }
}

/**
 * Load a URL and wait until the network has been quiet for `quietMs`, or `capMs` has passed.
 * Returns the final URL the tab is on.
 */
/** Analytics and chat widgets keep the network busy forever and carry no copy; they are not loaded. */
export const BLOCKED_URLS = ["*google-analytics.com*", "*googletagmanager.com*", "*doubleclick.net*", "*facebook.net*", "*connect.facebook.*", "*hotjar.*", "*clarity.ms*", "*segment.io*", "*segment.com*", "*intercom.io*", "*intercomcdn.*", "*mixpanel.com*", "*amplitude.com*", "*fullstory.com*", "*optimizely.com*", "*tiktok.com*", "*snap.licdn.com*", "*bat.bing.com*", "*yandex.*", "*.mp4*", "*.webm*", "*youtube.com/embed*", "*player.vimeo.com*"];

export async function loadAndSettle(session, url, { quietMs = 600, capMs = 10_000 } = {}) {
  let inflight = 0;
  let lastActivity = Date.now();
  const bump = (delta) => () => {
    inflight = Math.max(0, inflight + delta);
    lastActivity = Date.now();
  };
  session.on("Network.requestWillBeSent", bump(1));
  session.on("Network.loadingFinished", bump(-1));
  session.on("Network.loadingFailed", bump(-1));
  let loaded = false;
  session.on("Page.loadEventFired", () => {
    loaded = true;
    lastActivity = Date.now();
  });

  // A page that opens alert(), confirm() or a beforeunload prompt would stall every step after it.
  session.on("Page.javascriptDialogOpening", () => {
    session.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
  });
  await session.send("Page.enable");
  await session.send("Network.enable");
  await session.send("Network.setBlockedURLs", { urls: BLOCKED_URLS });
  await session.send("Runtime.enable");
  await session.send("Emulation.setDeviceMetricsOverride", { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: false });
  const nav = await session.send("Page.navigate", { url });
  if (nav.errorText) throw Object.assign(new Error(nav.errorText), { reason: "render_failed" });

  const started = Date.now();
  while (Date.now() - started < capMs) {
    await sleep(150);
    if (loaded && inflight <= 2 && Date.now() - lastActivity >= quietMs) break;
  }
  return session.evaluate("location.href");
}

export { sleep };
