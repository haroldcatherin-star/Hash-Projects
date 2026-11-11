// Génère le kit de marque Fonsai dans marque/ : logos, palette, visuels réseaux, guide de marque et fiche PDF.
//   npm run marque
// Les textes (marque/04-textes, *.md) sont écrits à la main ; ce script ne fabrique que les images et PDF.

import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const OUT = resolve(ROOT, "marque");
const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"]
  .find((p) => p && existsSync(p));

/* ---------- couleurs ---------- */
export const C = {
  green: "#1E3A2B", zen: "#2A6049", moss: "#7FB894", cream: "#F4EFE6", paper: "#EDE3CC",
  sun: "#E2553B", sunText: "#C7472F", ink: "#1E2A22", stone: "#909783", stoneDark: "#7C8370", night: "#0F1A14",
};

/* ---------- logos (SVG) ---------- */
const ICON = readFileSync(resolve(ROOT, "public/favicon.svg"), "utf8").trim();
function symbol(v) {
  const p = {
    vert: { sun: C.sun, top: C.green, under: "#4C6B58", facet: "#3A5545" },
    creme: { sun: C.sun, top: C.paper, under: C.stone, facet: C.stoneDark },
    noir: { sun: "#111111", top: "#111111", under: "#111111", facet: "#111111" },
    blanc: { sun: "#FFFFFF", top: "#FFFFFF", under: "#FFFFFF", facet: "#FFFFFF" },
  }[v];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 17 72 75">
  <circle cx="50" cy="30" r="9" fill="${p.sun}"/>
  <path d="M18 52 H82 L56 84 Q50 90 44 84 Z" fill="${p.under}"/>
  <path d="M50 52 H82 L56 84 Q53 87 50 87.5 Z" fill="${p.facet}"/>
  <rect x="18" y="47" width="64" height="9" rx="4.5" fill="${p.top}"/>
</svg>`;
}
const uri = (svg) => "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
const img = (file) => "data:image/jpeg;base64," + readFileSync(resolve(ROOT, file)).toString("base64");
const ISLAND = img("public/assets/island.jpg");

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">`;
const BASE = `*{box-sizing:border-box;margin:0;padding:0} html,body{font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}`;
const page = (body, css = "", bg = "transparent") => `<!doctype html><html lang="fr"><head><meta charset="utf-8">${FONTS}<style>${BASE} html,body{background:${bg}} ${css}</style></head><body>${body}</body></html>`;

function lockup({ dark = false, tagline = false, vertical = false, size = 1 }) {
  const fg = dark ? C.paper : C.green, tg = dark ? "#F0765C" : C.sunText;
  const s = (n) => n * size + "px";
  return `<div style="display:inline-flex;${vertical ? "flex-direction:column;" : ""}align-items:center;gap:${s(vertical ? 28 : 26)};padding:${s(30)}">
    <img src="${uri(ICON)}" style="width:${s(vertical ? 200 : 132)};height:${s(vertical ? 200 : 132)}">
    <div style="display:flex;flex-direction:column;${vertical ? "align-items:center;" : ""}gap:${s(6)}">
      <span style="font-weight:800;font-size:${s(vertical ? 124 : 112)};letter-spacing:-.04em;line-height:1;color:${fg}">Fonsai</span>
      ${tagline ? `<span style="font-weight:600;font-size:${s(vertical ? 34 : 30)};letter-spacing:-.01em;color:${tg};${vertical ? "" : "padding-left:" + s(4)}">Make focus addictive</span>` : ""}
    </div></div>`;
}

/* ---------- rendu ---------- */
mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const tab = await browser.newPage();

async function render(html, file, { w, h, dpr = 1, pdf = false, fit = false, transparent = false }) {
  await tab.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  await tab.setContent(html, { waitUntil: "load", timeout: 60000 });
  await tab.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
  const path = resolve(OUT, file);
  mkdirSync(resolve(path, ".."), { recursive: true });
  if (pdf) {
    await tab.pdf({ path, width: w + "px", height: h + "px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    if (process.env.MARQUE_PREVIEW) await tab.screenshot({ path: resolve(process.env.MARQUE_PREVIEW, file.split("/").pop() + ".png"), fullPage: true });
  } else if (fit) {
    const el = await tab.$("body > *");
    await el.screenshot({ path, omitBackground: transparent });
  } else {
    await tab.screenshot({ path, omitBackground: transparent, type: file.endsWith(".jpg") ? "jpeg" : "png", ...(file.endsWith(".jpg") ? { quality: 88 } : {}) });
  }
  console.log("✓", file);
}
const write = (file, txt) => { const p = resolve(OUT, file); mkdirSync(resolve(p, ".."), { recursive: true }); writeFileSync(p, txt); console.log("✓", file); };

/* 01 · icône */
write("01-logos/icone/fonsai-icone.svg", ICON + "\n");
for (const s of [1024, 512, 256, 128, 64, 32]) {
  await render(page(`<img src="${uri(ICON)}" style="display:block;width:100vw;height:100vh">`), `01-logos/icone/fonsai-icone-${s}.png`, { w: s, h: s, transparent: true });
}
await render(page(`<img src="${uri(ICON)}" style="display:block;width:100vw;height:100vh">`, "", C.green), "01-logos/icone/fonsai-icone-carree-1024.png", { w: 1024, h: 1024 });

/* 01 · symbole */
for (const v of ["vert", "creme", "noir", "blanc"]) {
  write(`01-logos/symbole/fonsai-symbole-${v}.svg`, symbol(v) + "\n");
  await render(page(`<img src="${uri(symbol(v))}" style="display:block;width:100vw;height:100vh;object-fit:contain">`), `01-logos/symbole/fonsai-symbole-${v}-1024.png`, { w: 983, h: 1024, transparent: true });
}

/* 01 · logotype */
for (const dark of [false, true]) for (const tagline of [false, true]) for (const vertical of [false, true]) {
  const name = `fonsai-logo-${vertical ? "vertical" : "horizontal"}${tagline ? "-signature" : ""}-${dark ? "sombre" : "clair"}`;
  const html = page(lockup({ dark, tagline, vertical }), "body{display:inline-block}");
  await render(html, `01-logos/logotype/${name}.png`, { w: 1400, h: 900, dpr: 2, fit: true, transparent: true });
}
// versions PDF vectorielles (pour l'impression), sur fond
for (const dark of [false, true]) {
  const html = page(`<div style="width:100vw;height:100vh;display:flex;align-items:center;justify-content:center">${lockup({ dark, tagline: true })}</div>`, "@page{size:1000px 420px;margin:0}", dark ? C.night : C.cream);
  await render(html, `01-logos/logotype/fonsai-logo-signature-${dark ? "sombre" : "clair"}.pdf`, { w: 1000, h: 420, pdf: true });
}

/* 02 · palette */
const SW = [
  ["Vert Fonsai", C.green, "Couleur de marque : logo, fonds forts, boutons principaux"],
  ["Vert zen", C.zen, "Boutons et liens sur fond clair, couleur par défaut de l'app"],
  ["Mousse", C.moss, "Accent sur fond sombre"],
  ["Crème", C.cream, "Fond principal du site et des documents"],
  ["Papier", C.paper, "L'île du logo, surfaces douces"],
  ["Soleil", C.sun, "Le soleil du logo, petites touches d'accent"],
  ["Soleil texte", C.sunText, "Accroches et sur-titres en rouge, lisibles sur crème"],
  ["Encre", C.ink, "Texte principal"],
  ["Pierre", C.stone, "Le dessous de l'île, textes secondaires sur fond vert"],
  ["Nuit", C.night, "Fond du thème sombre"],
];
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(", ");
const light = (h) => { const [r, g, b] = rgb(h).split(", ").map(Number); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };
await render(page(`<div style="padding:70px 80px;height:100vh;display:flex;flex-direction:column;gap:36px">
  <div style="display:flex;align-items:center;gap:18px"><img src="${uri(ICON)}" style="width:64px;height:64px"><div><div style="font-weight:800;font-size:40px;letter-spacing:-.03em;color:${C.green}">Palette Fonsai</div><div style="color:#6b7268;font-size:20px">Vert profond, crème et soleil rouge</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:18px;flex:1">
  ${SW.map(([n, h]) => `<div style="border-radius:22px;background:${h};padding:22px;display:flex;flex-direction:column;justify-content:flex-end;color:${light(h) ? C.ink : "#fff"};${h === C.cream ? "border:2px solid #e4dccb" : ""}"><b style="font-size:22px">${n}</b><span style="font-family:'JetBrains Mono';font-size:17px;opacity:.85">${h}</span><span style="font-family:'JetBrains Mono';font-size:14px;opacity:.7">RGB ${rgb(h)}</span></div>`).join("")}
  </div></div>`, "", C.cream), "02-couleurs/palette-fonsai.png", { w: 1600, h: 1000 });
write("02-couleurs/couleurs.md", `# Couleurs Fonsai

![Palette](palette-fonsai.png)

| Nom | Hex | RGB | Usage |
|---|---|---|---|
${SW.map(([n, h, u]) => `| ${n} | \`${h}\` | ${rgb(h)} | ${u} |`).join("\n")}

## Règles

- **Le vert domine, le rouge ponctue.** Le Soleil n'est jamais une couleur de fond ni de grand bouton : il attire l'œil sur un détail (le soleil du logo, une accroche, un badge).
- **Fond clair = Crème**, pas blanc pur. **Fond sombre = Nuit**, pas noir pur.
- **Texte sur Vert Fonsai** : Crème ou Papier. **Texte sur Crème** : Encre.
- Dans l'app, le rouge reste réservé aux alertes (retards, aujourd'hui) : ne pas l'utiliser pour les boutons.
`);

/* 05 · réseaux sociaux */
await render(page(`<img src="${uri(ICON)}" style="display:block;width:100vw;height:100vh">`, "", C.green), "05-reseaux-sociaux/photo-profil-1080.png", { w: 1080, h: 1080 });
const banner = (w, h, scale) => page(`<div style="width:${w}px;height:${h}px;display:grid;grid-template-columns:1.05fr 1fr;background:${C.cream}">
  <div style="display:flex;flex-direction:column;justify-content:center;padding-left:${90 * scale}px;gap:${10 * scale}px">
    <div style="display:flex;align-items:center;gap:${14 * scale}px"><img src="${uri(ICON)}" style="width:${64 * scale}px;height:${64 * scale}px"><span style="font-weight:800;font-size:${52 * scale}px;letter-spacing:-.04em;color:${C.green}">Fonsai</span></div>
    <div style="font-weight:800;font-size:${44 * scale}px;letter-spacing:-.035em;line-height:1.02;color:${C.ink};margin-top:${10 * scale}px">Make focus <span style="color:${C.zen}">addictive.</span></div>
    <div style="font-size:${20 * scale}px;color:#3a463e;font-weight:500">Chaque minute de focus fait pousser ton île · fonsai.app</div>
  </div>
  <div style="background:url(${ISLAND}) center/cover"></div></div>`);
await render(banner(1584, 396, 0.95), "05-reseaux-sociaux/banniere-linkedin-1584x396.png", { w: 1584, h: 396 });
await render(banner(1500, 500, 1.1), "05-reseaux-sociaux/banniere-x-1500x500.png", { w: 1500, h: 500 });
await render(page(`<div style="width:1080px;height:1080px;background:${C.green};display:flex;flex-direction:column;justify-content:space-between;padding:96px">
  <img src="${uri(symbol("creme"))}" style="width:150px">
  <div style="font-weight:800;font-size:132px;line-height:.95;letter-spacing:-.05em;color:${C.paper}">Make focus<br><span style="color:${C.sun}">addictive.</span></div>
  <div style="display:flex;justify-content:space-between;align-items:center;color:${C.stone};font-size:34px;font-weight:600"><span>1 minute = 1 brique</span><span style="color:${C.paper}">fonsai.app</span></div></div>`), "05-reseaux-sociaux/post-instagram-signature-1080.png", { w: 1080, h: 1080 });
await render(page(`<div style="width:1080px;height:1080px;position:relative;background:url(${ISLAND}) center/cover">
  <div style="position:absolute;left:56px;right:56px;bottom:56px;background:rgba(244,239,230,.94);border-radius:36px;padding:36px 40px;display:flex;align-items:center;gap:28px">
  <img src="${uri(ICON)}" style="width:110px;height:110px"><div><div style="font-weight:800;font-size:54px;letter-spacing:-.04em;color:${C.green};line-height:1">Ton île grandit<br>quand tu bosses.</div><div style="font-size:28px;color:#3a463e;margin-top:10px;font-weight:500">Fonsai · fonsai.app</div></div></div></div>`), "05-reseaux-sociaux/post-instagram-ile-1080.png", { w: 1080, h: 1080 });
await render(page(`<div style="width:1080px;height:1920px;background:${C.green};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:70px;text-align:center;padding:120px">
  <img src="${uri(symbol("creme"))}" style="width:360px">
  <div style="font-weight:800;font-size:120px;line-height:.95;letter-spacing:-.05em;color:${C.paper}">Make focus<br><span style="color:${C.sun}">addictive.</span></div>
  <div style="font-size:44px;color:${C.stone};font-weight:500;line-height:1.3">Planning, tâches, habitudes,<br>moyenne et focus.<br>Une île qui grandit avec toi.</div>
  <div style="margin-top:40px;background:${C.paper};color:${C.green};font-weight:800;font-size:46px;padding:30px 60px;border-radius:999px">fonsai.app</div></div>`), "05-reseaux-sociaux/story-1080x1920.png", { w: 1080, h: 1920 });

/* 07 · captures de l'app (copiées depuis le site) */
for (const f of ["home-light", "home-dark", "tasks-light", "habits-light", "notes-light", "sessions-light", "carnet-light", "focus-light", "island-editor", "island", "phone-home", "phone-focus", "og"]) {
  mkdirSync(resolve(OUT, "07-captures"), { recursive: true });
  copyFileSync(resolve(ROOT, "public/assets", f + ".jpg"), resolve(OUT, "07-captures", (f === "og" ? "image-de-partage" : f) + ".jpg"));
}
console.log("✓ 07-captures");

/* 06 · fiche de présentation (A4 portrait) */
const QR = await QRCode.toString("https://fonsai.app", { type: "svg", margin: 0, color: { dark: C.green, light: "#0000" } });
const shotHome = img("public/assets/home-light.jpg"), shotPhone = img("public/assets/phone-focus.jpg"), shotEditor = img("public/assets/island-editor.jpg");
await render(page(`<div style="width:794px;height:1123px;padding:50px 58px;display:flex;flex-direction:column;gap:20px;color:${C.ink}">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div style="display:flex;align-items:center;gap:14px"><img src="${uri(ICON)}" style="width:54px;height:54px"><span style="font-weight:800;font-size:38px;letter-spacing:-.04em;color:${C.green}">Fonsai</span></div>
    <span style="font-weight:600;color:${C.sunText};font-size:15px">Make focus addictive</span></div>
  <div><div style="font-weight:800;font-size:36px;line-height:1.05;letter-spacing:-.035em">L'app des étudiants où chaque minute de focus <span style="color:${C.zen}">fait pousser une île.</span></div>
  <p style="margin-top:16px;font-size:15px;line-height:1.6;color:#3a463e">Agenda, to-do, suivi d'habitudes, tableur pour la moyenne, minuteur : la plupart des étudiants jonglent entre plusieurs outils et finissent par tout lâcher. Fonsai les réunit au même endroit et ajoute ce qui manque : une raison d'y revenir. Chaque minute de concentration rapporte une brique pour construire sa propre île zen en 3D.</p></div>
  <img src="${shotEditor}" style="width:100%;height:190px;object-fit:cover;object-position:left 30%;border-radius:16px;border:1px solid #e4dccb">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
  ${[["Organise-toi", "Journée, tâches, habitudes, notes, séances et moyenne pondérée, dans une seule app."], ["Concentre-toi", "Sessions « lock in » : une durée, un rythme (25/5, 50/10, 90/20), c'est parti."], ["Construis ton île", "1 minute = 1 brique, ×1,5 avec une série. 14 éléments, une île de 6×6 à 9×9."]]
    .map(([t, d]) => `<div style="background:#fffdf8;border:1px solid #e4dccb;border-radius:16px;padding:16px"><b style="font-size:16px;color:${C.green}">${t}</b><p style="font-size:13px;line-height:1.5;color:#3a463e;margin-top:6px">${d}</p></div>`).join("")}</div>
  <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:18px;height:190px">
    <img src="${shotHome}" style="width:100%;height:190px;object-fit:cover;object-position:left top;border-radius:16px;border:1px solid #e4dccb">
    <img src="${shotPhone}" style="width:100%;height:190px;object-fit:cover;object-position:top;border-radius:16px;border:1px solid #e4dccb"></div>
  <div style="display:flex;align-items:center;gap:22px;background:${C.green};color:${C.paper};border-radius:18px;padding:18px 22px">
    <div style="width:84px;height:84px;background:${C.paper};border-radius:10px;padding:8px">${QR.replace("<svg", '<svg width="68" height="68"')}</div>
    <div style="flex:1;font-size:14px;line-height:1.55"><b style="font-size:20px">fonsai.app</b><br>Gratuit · ordinateur et téléphone · hors ligne · compte facultatif<br>Presse : fonsai.app/presse · contact@fonsai.app</div></div>
  </div>`, "@page{size:794px 1123px;margin:0}", C.cream), "06-documents/fiche-presentation-fonsai.pdf", { w: 794, h: 1123, pdf: true });

/* 06 · guide de marque (A4 paysage, plusieurs pages) */
const P = (inner, bg = C.cream, fg = C.ink) => `<section style="width:1123px;height:794px;background:${bg};color:${fg};padding:64px 72px;position:relative;page-break-after:always;overflow:hidden">${inner}</section>`;
const H = (n, t, sub = "") => `<div style="font-family:'JetBrains Mono';font-size:13px;color:${C.sunText};letter-spacing:.05em">${n}</div><h2 style="font-size:44px;font-weight:800;letter-spacing:-.035em;margin:6px 0 8px;color:${C.green}">${t}</h2>${sub ? `<p style="font-size:17px;color:#3a463e;max-width:760px;line-height:1.55">${sub}</p>` : ""}`;
const foot = (n) => `<div style="position:absolute;left:72px;right:72px;bottom:34px;display:flex;justify-content:space-between;font-size:12px;color:#8a8f86"><span>Fonsai · Guide de marque</span><span>${n}</span></div>`;
const tile = (inner, bg = "#fffdf8", border = "#e4dccb") => `<div style="background:${bg};border:1px solid ${border};border-radius:18px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">${inner}</div>`;
const X = `<div style="position:absolute;top:10px;right:12px;width:30px;height:30px;border-radius:50%;background:${C.sun};color:#fff;font-weight:800;display:grid;place-items:center;font-size:17px">✕</div>`;
const pages = [
  P(`<div style="height:100%;display:flex;flex-direction:column;justify-content:space-between">
     <img src="${uri(symbol("creme"))}" style="width:150px">
     <div><div style="font-weight:800;font-size:120px;letter-spacing:-.05em;line-height:.9;color:${C.paper}">Fonsai</div>
     <div style="font-weight:700;font-size:36px;letter-spacing:-.02em;color:${C.sun};margin-top:16px">Make focus addictive.</div></div>
     <div style="display:flex;justify-content:space-between;color:${C.stone};font-size:16px"><span>Guide de marque · version 1</span><span>Novembre 2026</span></div></div>`, C.green, C.paper),
  P(`${H("01", "Pourquoi Fonsai", "Réussir ses études, c'est surtout tenir dans la durée. Les outils pour s'organiser sont éparpillés, et aucun ne donne envie d'y revenir le lendemain. Fonsai réunit tout en une app et rend la concentration addictive : chaque minute de focus fait pousser une île.")}
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:40px">
     ${[["Le nom", "Fonsai = <b>focus</b> + <b>bonsaï</b>. Quelque chose qui grandit lentement, grâce au soin qu'on y met chaque jour."], ["La signature", "<b>Make focus addictive.</b> Toujours en anglais, toujours avec le point. C'est la promesse : donner envie de se concentrer."], ["L'univers", "Un jardin japonais flottant, calme et chaleureux. Zen, jamais austère ; motivant, jamais culpabilisant."]]
       .map(([t, d]) => `<div style="background:#fffdf8;border:1px solid #e4dccb;border-radius:18px;padding:26px"><b style="font-size:20px;color:${C.green}">${t}</b><p style="font-size:16px;line-height:1.6;color:#3a463e;margin-top:10px">${d}</p></div>`).join("")}</div>${foot(2)}`),
  P(`${H("02", "Le logo", "Une île flottante sous un soleil levant. L'île, c'est ce que tu construis minute après minute ; le soleil, c'est la journée qui commence et le focus qui s'installe.")}
     <div style="display:grid;grid-template-columns:1fr 1.6fr;gap:22px;margin-top:30px;height:430px">
       ${tile(`<img src="${uri(ICON)}" style="width:230px;height:230px">`)}
       <div style="display:grid;grid-template-rows:1fr 1fr;gap:22px">${tile(lockup({ tagline: true, size: 0.55 }))}${tile(lockup({ tagline: true, dark: true, size: 0.55 }), C.night, C.night)}</div></div>
     <p style="font-size:14px;color:#6b7268;margin-top:14px">L'icône (application, réseaux, favicon) · le logotype horizontal, sur fond clair et sur fond sombre.</p>${foot(3)}`),
  P(`${H("03", "Les déclinaisons du symbole", "Sans le carré vert, le symbole s'adapte au fond. Choisis la version qui offre le plus de contraste.")}
     <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:34px;height:380px">
       ${[["vert", C.cream, "Couleur, sur fond clair"], ["creme", C.green, "Couleur, sur fond vert ou sombre"], ["noir", "#ffffff", "Une couleur, impression"], ["blanc", C.zen, "Une couleur, sur photo ou couleur"]]
         .map(([v, bg, l]) => `<div style="display:flex;flex-direction:column;gap:10px">${tile(`<img src="${uri(symbol(v))}" style="width:140px">`, bg, bg === "#ffffff" ? "#e4dccb" : bg).replace("position:relative", "position:relative;flex:1")}<span style="font-size:14px;color:#3a463e">${l}</span></div>`).join("")}</div>${foot(4)}`),
  P(`${H("04", "Espace et tailles", "Laisse respirer le logo : autour de lui, garde un espace libre au moins égal au diamètre du soleil. En dessous des tailles minimales, il perd sa lisibilité.")}
     <div style="display:grid;grid-template-columns:1.2fr 1fr;gap:30px;margin-top:34px;height:400px">
       ${tile(`<div style="position:relative;padding:46px;border:2px dashed ${C.sun}"><img src="${uri(ICON)}" style="width:200px;height:200px;display:block"></div><span style="position:absolute;bottom:18px;font-size:14px;color:#6b7268">Zone de protection = diamètre du soleil</span>`)}
       ${tile(`<div style="display:flex;flex-direction:column;gap:26px;font-size:16px;color:${C.ink}">
          <div style="display:flex;align-items:center;gap:18px"><img src="${uri(ICON)}" style="width:16px;height:16px"><span><b>Icône : 16 px</b> minimum (favicon)</span></div>
          <div style="display:flex;align-items:center;gap:18px">${lockup({ size: 0.19 })}<span><b>Logotype : 24 px</b> de haut minimum</span></div>
          <div style="display:flex;align-items:center;gap:18px"><img src="${uri(ICON)}" style="width:40px;height:40px"><span><b>Imprimé : 10 mm</b> minimum</span></div></div>`)}</div>${foot(5)}`),
  P(`${H("05", "À ne pas faire", "Le logo ne se modifie pas. Utilise toujours les fichiers du kit.")}
     <div style="display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr;gap:18px;margin-top:28px;height:440px">
       ${[[`<img src="${uri(ICON)}" style="width:110px;height:110px;transform:scale(1.6,.75)">`, "Le déformer"], [`<img src="${uri(ICON)}" style="width:110px;height:110px;filter:hue-rotate(160deg)">`, "Changer ses couleurs"], [`<img src="${uri(ICON)}" style="width:110px;height:110px;transform:rotate(-18deg)">`, "Le faire pivoter"], [`<img src="${uri(ICON)}" style="width:110px;height:110px;filter:drop-shadow(0 0 18px #ff00ff)">`, "Ajouter ombres ou effets"], [`<div style="width:100%;height:100%;background:url(${ISLAND}) center/cover;display:grid;place-items:center"><img src="${uri(symbol("vert"))}" style="width:90px"></div>`, "Le poser sur un fond chargé sans contraste"], [`<span style="font-weight:800;font-size:46px;color:${C.green};font-family:Georgia,serif;font-style:italic">FonSai</span>`, "Réécrire le nom autrement"]]
         .map(([inner, l]) => `<div style="display:flex;flex-direction:column;gap:8px">${tile(inner + X).replace("position:relative", "position:relative;flex:1")}<span style="font-size:14px;color:#3a463e">${l}</span></div>`).join("")}</div>${foot(6)}`),
  P(`${H("06", "Couleurs", "Le vert domine, le rouge ponctue. Fond clair crème, fond sombre nuit, jamais de blanc ou de noir purs.")}
     <div style="display:grid;grid-template-columns:repeat(5,1fr);grid-template-rows:1fr 1fr;gap:14px;margin-top:26px;height:440px">
       ${SW.map(([n, h, u]) => `<div style="background:${h};border-radius:16px;padding:16px;display:flex;flex-direction:column;justify-content:flex-end;color:${light(h) ? C.ink : "#fff"};${h === C.cream ? "border:1px solid #e4dccb" : ""}"><b style="font-size:16px">${n}</b><span style="font-family:'JetBrains Mono';font-size:13px">${h}</span><span style="font-size:11px;line-height:1.35;opacity:.8;margin-top:4px">${u}</span></div>`).join("")}</div>${foot(7)}`),
  P(`${H("07", "Typographie", "Une seule famille : Inter, gratuite et open source (Google Fonts). JetBrains Mono pour les chiffres et données.")}
     <div style="display:grid;grid-template-columns:1.3fr 1fr;gap:30px;margin-top:30px">
       <div style="display:flex;flex-direction:column;gap:18px">
         <div><span style="font-size:12px;color:#8a8f86">Titre · Inter ExtraBold 800 · interlettrage −4 %</span><div style="font-weight:800;font-size:58px;letter-spacing:-.04em;line-height:1;color:${C.green}">Tout ton semestre.</div></div>
         <div><span style="font-size:12px;color:#8a8f86">Sous-titre · Inter Bold 700</span><div style="font-weight:700;font-size:28px;letter-spacing:-.02em">Une minute de focus = une brique.</div></div>
         <div><span style="font-size:12px;color:#8a8f86">Texte · Inter Regular 400 / Medium 500</span><p style="font-size:17px;line-height:1.6;color:#3a463e">Chaque pomodoro terminé rapporte des briques, avec un bonus quand on enchaîne les jours.</p></div>
         <div><span style="font-size:12px;color:#8a8f86">Accroche · Inter SemiBold 600, couleur Soleil texte</span><div style="font-weight:600;font-size:16px;color:${C.sunText}">Make focus addictive · pour les étudiants</div></div>
       </div>
       ${tile(`<div style="text-align:center"><div style="font-weight:800;font-size:150px;letter-spacing:-.05em;color:${C.green};line-height:1">Aa</div><div style="font-family:'JetBrains Mono';font-size:30px;color:${C.zen};margin-top:10px">25:00 · 13,58</div><div style="font-size:14px;color:#6b7268;margin-top:14px">fonts.google.com/specimen/Inter</div></div>`)}</div>${foot(8)}`),
  P(`${H("08", "Ton de voix", "Fonsai parle comme un pote motivé qui bosse à côté de toi. On tutoie, on fait court, on encourage.")}
     <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:26px">
       ${[["Calme", "zen, sans pression"], ["Complice", "un pote, pas un coach"], ["Clair", "phrases courtes, mots simples"], ["Encourageant", "la régularité, pas la perfection"]].map(([t, d]) => `<div style="background:${C.green};color:${C.paper};border-radius:16px;padding:20px"><b style="font-size:22px">${t}</b><p style="font-size:14px;color:${C.stone};margin-top:6px">${d}</p></div>`).join("")}</div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px;font-size:16px">
       ${[["Félicitations !!! Vous avez complété votre session avec succès !", "+25 briques pour ton île."], ["Vous n'avez pas travaillé hier, votre série est perdue.", "Nouvelle série : c'est reparti."], ["Boostez votre productivité grâce à notre solution innovante.", "Tout ton semestre, une seule app."]]
         .map(([no, yes]) => `<div style="background:#fbe9e4;border-radius:14px;padding:14px 18px;color:#8e2a18">✕ ${no}</div><div style="background:#e5efe8;border-radius:14px;padding:14px 18px;color:${C.green}">✓ ${yes}</div>`).join("")}</div>${foot(9)}`),
  P(`${H("09", "En situation")}
     <div style="display:grid;grid-template-columns:1.25fr 1fr 1fr;gap:18px;margin-top:20px;height:520px">
       <div style="display:flex;flex-direction:column;gap:18px"><img src="${img("public/assets/og.jpg")}" style="width:100%;border-radius:14px;border:1px solid #e4dccb"><img src="${shotHome}" style="width:100%;flex:1;min-height:0;object-fit:cover;object-position:left top;border-radius:14px;border:1px solid #e4dccb"></div>
       <img src="${"data:image/png;base64," + readFileSync(resolve(OUT, "05-reseaux-sociaux/post-instagram-signature-1080.png")).toString("base64")}" style="width:100%;border-radius:14px;align-self:start">
       <img src="${"data:image/png;base64," + readFileSync(resolve(OUT, "05-reseaux-sociaux/story-1080x1920.png")).toString("base64")}" style="width:100%;height:100%;object-fit:cover;border-radius:14px"></div>${foot(10)}`),
  P(`<div style="height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:26px;text-align:center">
     <img src="${uri(symbol("creme"))}" style="width:120px"><div style="font-weight:800;font-size:64px;letter-spacing:-.04em;color:${C.paper}">fonsai.app</div>
     <div style="font-size:20px;color:${C.stone};line-height:1.7">Presse et visuels : fonsai.app/presse<br>Contact : contact@fonsai.app</div></div>`, C.green, C.paper),
];
await render(page(pages.join(""), "@page{size:1123px 794px;margin:0} section:last-child{page-break-after:auto}", C.cream), "06-documents/guide-de-marque-fonsai.pdf", { w: 1123, h: 794, pdf: true });

await browser.close();
