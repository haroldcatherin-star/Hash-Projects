// Régénère les captures d'écran du site (public/assets/*.jpg) à partir de l'app réelle.
//   npm run captures             → toutes les captures
//   npm run captures -- og focus → seulement celles dont le nom contient « og » ou « focus »
// Lance Vite, ouvre l'app dans Chrome (sans fenêtre) avec des données de démo (scripts/demo-data.mjs)
// et une horloge fixée à 16 h 24 aujourd'hui, pour qu'une séance soit « en cours ».

import { createServer } from "vite";
import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { demoData } from "./demo-data.mjs";

const OUT = resolve(import.meta.dirname, "../public/assets");
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
].find((p) => p && existsSync(p));
if (!CHROME) throw new Error("Chrome introuvable : définis CHROME_PATH.");

const desktop = { width: 1000, height: 625, deviceScaleFactor: 2 };
const phone = { width: 450, height: 766, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const SHOTS = [
  { name: "home-light", module: "home" },
  { name: "home-dark", module: "home", theme: "dark" },
  { name: "tasks-light", module: "tasks" },
  { name: "habits-light", module: "habits" },
  { name: "notes-light", module: "notes" },
  { name: "sessions-light", module: "sessions" },
  { name: "carnet-light", module: "carnet" },
  { name: "focus-light", module: "focus", wait: 3500 },
  { name: "island-editor", module: "focus", island: true, wait: 4500 },
  { name: "phone-home", module: "home", viewport: phone, scrollTo: "#hm-tl" },
  { name: "phone-focus", module: "focus", viewport: phone, wait: 3500 },
  { name: "og", page: "/scripts/og.html", viewport: { width: 1200, height: 630, deviceScaleFactor: 1 }, wait: 800 },
  { name: "fonsai-logo", page: "/favicon.svg", viewport: { width: 1024, height: 1024, deviceScaleFactor: 1 }, png: true, wait: 300 },
];

const only = process.argv.slice(2);
const shots = only.length ? SHOTS.filter((s) => only.some((o) => s.name.includes(o))) : SHOTS;

const now = new Date(); now.setHours(16, 24, 0, 0);
const storage = Object.fromEntries(Object.entries(demoData(now)).map(([k, v]) => [k, JSON.stringify(v)]));

const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: "error" });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--hide-scrollbars"] });

try {
  for (const s of shots) {
    const page = await browser.newPage();
    await page.setViewport(s.viewport || desktop);
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.evaluateOnNewDocument((fake, items, theme) => {
      // Horloge figée (mais qui avance) : la journée de démo est toujours à 16 h 24.
      const Real = Date, t0 = Real.now();
      class FakeDate extends Real {
        constructor(...a) { if (a.length) super(...a); else super(fake + (Real.now() - t0)); }
        static now() { return fake + (Real.now() - t0); }
      }
      window.Date = FakeDate;
      try {
        localStorage.clear();
        for (const [k, v] of Object.entries(items)) localStorage.setItem(k, v);
        localStorage.setItem("hashprojects_theme_v1", theme);
        localStorage.setItem("hp_open_app", "1");
      } catch (e) {}
    }, now.getTime(), storage, s.theme || "light");

    await page.goto(base + (s.page || "/app/"), { waitUntil: "networkidle0" });
    if (s.module) {
      await page.evaluate((m) => { window.switchModule(m); window.scrollTo(0, 0); }, s.module);
    }
    if (s.scrollTo) await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 140); }, s.scrollTo);
    if (s.island) await page.click("#isl-card");
    await new Promise((r) => setTimeout(r, s.wait || 1200));
    await page.evaluate(() => document.getElementById("toast")?.classList.remove("show"));

    const file = resolve(OUT, s.name + (s.png ? ".png" : ".jpg"));
    await page.screenshot(s.png ? { path: file, type: "png", omitBackground: true } : { path: file, type: "jpeg", quality: 84 });
    console.log("✓", s.name);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
