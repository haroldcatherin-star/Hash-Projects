// Livret « L'histoire de Fonsai » : un PDF qui raconte la marque avec un fil rouge
// (le soleil du logo avance sur un fil rouge, chapitre après chapitre).
//   npm run livret   → marque/06-documents/livret-fonsai.pdf
// À lancer après npm run marque (il réutilise les visuels du kit).

import puppeteer from "puppeteer-core";
import QRCode from "qrcode";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const K = (f) => resolve(ROOT, "marque", f);
const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"]
  .find((p) => p && existsSync(p));

const C = { green: "#1E3A2B", zen: "#2A6049", moss: "#7FB894", cream: "#F4EFE6", paper: "#EDE3CC", sun: "#E2553B",
  sunText: "#C7472F", ink: "#1E2A22", stone: "#909783", night: "#0F1A14", line: "#E4DCCB", fg2: "#3A463E", muted: "#6B7268" };
const data = (file) => {
  const ext = file.split(".").pop();
  return `data:${ext === "svg" ? "image/svg+xml" : ext === "png" ? "image/png" : "image/jpeg"};base64,` + readFileSync(file).toString("base64");
};
const ICON = data(resolve(ROOT, "public/favicon.svg"));
const SYM = (v) => data(K(`01-logos/symbole/fonsai-symbole-${v}.svg`));
const SHOT = (f) => data(resolve(ROOT, "public/assets", f));
const SOC = (f) => data(K("05-reseaux-sociaux/" + f));
const QR = await QRCode.toString("https://fonsai.app", { type: "svg", margin: 0, color: { dark: C.green, light: "#0000" } });

/* ---------- le fil rouge ---------- */
const CHAPTERS = ["Le problème", "L'idée", "Le nom", "Le logo", "Les couleurs", "La voix", "L'app", "L'île", "En parler", "Les réseaux", "La suite"];
const N = CHAPTERS.length;
function thread(i, dark) { // i = 0 (couverture) … N+1 (dos)
  const x0 = 72, x1 = 1051, y = 748, pos = (k) => x0 + ((x1 - x0) * k) / (N + 1);
  const label = i >= 1 && i <= N ? `<text x="${pos(i)}" y="${y - 20}" text-anchor="middle" font-size="12" font-weight="600" fill="${dark ? C.paper : C.sunText}" font-family="Inter">${String(i).padStart(2, "0")} · ${CHAPTERS[i - 1]}</text>` : "";
  const dots = Array.from({ length: N }, (_, k) => k + 1).map((k) =>
    `<circle cx="${pos(k)}" cy="${y}" r="${k < i ? 4 : 3.5}" fill="${k < i ? C.sun : dark ? C.green : C.cream}" stroke="${C.sun}" stroke-width="1.5"/>`).join("");
  return `<svg width="1123" height="794" style="position:absolute;inset:0;pointer-events:none">
    <line x1="${x0}" y1="${y}" x2="${pos(i)}" y2="${y}" stroke="${C.sun}" stroke-width="2.5"/>
    <line x1="${pos(i)}" y1="${y}" x2="${x1}" y2="${y}" stroke="${C.sun}" stroke-width="1.2" stroke-dasharray="2 6" opacity=".55"/>
    ${dots}<circle cx="${pos(i)}" cy="${y}" r="11" fill="${C.sun}"/>${label}</svg>`;
}

/* ---------- briques de mise en page ---------- */
const page = (i, inner, { bg = C.cream, dark = false } = {}) =>
  `<section style="background:${bg};color:${dark ? C.paper : C.ink}">${inner}${thread(i, dark)}</section>`;
const kicker = (i) => `<div class="k">Chapitre ${String(i).padStart(2, "0")}</div>`;
const h = (t) => `<h2>${t}</h2>`;
const card = (inner, extra = "") => `<div class="card" style="${extra}">${inner}</div>`;
const shot = (src, extra = "") => `<img class="shot" src="${src}" style="${extra}">`;

const SW = [["Vert Fonsai", C.green], ["Vert zen", C.zen], ["Mousse", C.moss], ["Crème", C.cream], ["Papier", C.paper], ["Soleil", C.sun], ["Encre", C.ink], ["Pierre", C.stone]];
const light = (hx) => { const [r, g, b] = [1, 3, 5].map((k) => parseInt(hx.slice(k, k + 2), 16)); return (r * 299 + g * 587 + b * 114) / 1000 > 150; };

const pages = [
  /* 0 · couverture */
  page(0, `<div style="height:100%;display:flex;flex-direction:column;justify-content:center;gap:22px">
    <img src="${SYM("creme")}" style="width:130px">
    <div style="font-weight:800;font-size:108px;letter-spacing:-.05em;line-height:.9;color:${C.paper}">L'histoire<br>de Fonsai</div>
    <div style="font-weight:700;font-size:30px;color:${C.sun};letter-spacing:-.02em">Make focus addictive.</div>
    <div style="font-size:16px;color:${C.stone};margin-top:8px">Suis le fil rouge : le soleil avance d'un pas à chaque chapitre.</div></div>`, { bg: C.green, dark: true }),

  /* 1 · le problème */
  page(1, `${kicker(1)}${h("Tout le monde lâche au bout de deux semaines.")}
    <p class="lead">Un agenda ici, une to-do là, un tableur pour la moyenne, un minuteur sur le téléphone. On s'organise à fond la première semaine… puis on décroche.</p>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-top:34px">
      ${[["📅", "Agenda"], ["✅", "To-do"], ["🔁", "Habitudes"], ["📊", "Tableur de moyenne"], ["⏱️", "Minuteur"]].map(([e, t]) => card(`<div style="font-size:40px">${e}</div><b style="font-size:17px">${t}</b><span style="font-size:13px;color:${C.muted}">une appli de plus</span>`, "align-items:center;text-align:center;padding:26px 14px")).join("")}</div>
    <p class="big" style="margin-top:40px">Le vrai problème n'est pas de s'organiser.<br><span style="color:${C.zen}">C'est de tenir.</span></p>`),

  /* 2 · l'idée */
  page(2, `${kicker(2)}${h("Et si se concentrer devenait addictif ?")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:20px">
      <div><p class="lead">Fonsai réunit tout le semestre dans une seule app. Et il ajoute ce qui manque aux applis de productivité : <b>une raison d'y revenir.</b></p>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:22px">
        ${[["1 minute de focus", "= 1 brique"], ["Une série de jours", "jusqu'à ×1,5"], ["Des briques", "pour construire ton île"]].map(([a, b]) => `<div style="display:flex;justify-content:space-between;align-items:center;background:#fffdf8;border:1px solid ${C.line};border-radius:16px;padding:16px 20px;font-size:19px"><span>${a}</span><b style="color:${C.zen}">${b}</b></div>`).join("")}</div></div>
      ${shot(SHOT("island.jpg"), "height:430px;object-fit:cover")}</div>`),

  /* 3 · le nom */
  page(3, `${kicker(3)}${h("Fonsai = focus + bonsaï.")}
    <div style="display:flex;align-items:center;justify-content:center;gap:26px;margin-top:80px;font-weight:800;letter-spacing:-.04em">
      <div style="text-align:center"><div style="font-size:62px;color:${C.green}">Focus</div><div class="small" style="font-weight:500;letter-spacing:0;margin-top:6px">se concentrer</div></div>
      <div style="font-size:54px;color:${C.sun}">+</div>
      <div style="text-align:center"><div style="font-size:62px;color:${C.green}">Bonsaï</div><div class="small" style="font-weight:500;letter-spacing:0;margin-top:6px">grandir lentement, avec soin</div></div>
      <div style="font-size:54px;color:${C.sun}">=</div>
      <div style="text-align:center"><div style="font-size:62px;color:${C.zen}">Fonsai</div><div class="small" style="font-weight:500;letter-spacing:0;margin-top:6px">une majuscule, sans accent</div></div></div>
    <p class="lead" style="text-align:center;max-width:760px;margin:70px auto 0">Quelque chose qui pousse jour après jour, grâce au soin qu'on y met. Exactement ce que fait ton île quand tu travailles.</p>`),

  /* 4 · le logo */
  page(4, `${kicker(4)}${h("Une île sous un soleil levant.")}
    <div style="display:grid;grid-template-columns:300px 1fr;gap:34px;margin-top:22px;align-items:start">
      <img src="${ICON}" style="width:300px;height:300px">
      <div><p class="lead">L'<b>île</b>, c'est ce que tu construis minute après minute. Le <b>soleil</b>, c'est la journée qui commence et le focus qui s'installe. Pas d'arbre : Fonsai n'est pas une app de plus qui fait pousser une plante.</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:22px">
        ${[["vert", C.cream], ["creme", C.green], ["noir", "#ffffff"], ["blanc", C.zen]].map(([v, bg]) => `<div style="background:${bg};border:1px solid ${C.line};border-radius:16px;height:120px;display:grid;place-items:center"><img src="${SYM(v)}" style="width:62px"></div>`).join("")}</div>
      <p class="small" style="margin-top:10px">Le symbole se décline en vert, crème, noir et blanc selon le fond.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px">
        <div style="background:#fffdf8;border:1px solid ${C.line};border-radius:16px;height:110px;display:grid;place-items:center"><img src="${data(K("01-logos/logotype/fonsai-logo-horizontal-signature-clair.png"))}" style="height:78px"></div>
        <div style="background:${C.night};border-radius:16px;height:110px;display:grid;place-items:center"><img src="${data(K("01-logos/logotype/fonsai-logo-horizontal-signature-sombre.png"))}" style="height:78px"></div></div></div></div>`),

  /* 5 · les couleurs */
  page(5, `${kicker(5)}${h("Le vert domine, le rouge ponctue.")}
    <p class="lead">Calme et premium, à l'opposé du bleu de toutes les applis de productivité. Le rouge du soleil ne sert qu'à attirer l'œil sur un détail.</p>
    <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:10px;margin-top:30px;height:300px">
      ${SW.map(([n, hx]) => `<div style="background:${hx};border-radius:16px;padding:14px;display:flex;flex-direction:column;justify-content:flex-end;color:${light(hx) ? C.ink : "#fff"};${hx === C.cream ? `border:1px solid ${C.line}` : ""}"><b style="font-size:14px">${n}</b><span class="mono" style="font-size:12px">${hx}</span></div>`).join("")}</div>`),

  /* 6 · la voix */
  page(6, `${kicker(6)}${h("Fonsai parle comme un pote motivé.")}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px">
      ${[["Calme", "zen, sans pression"], ["Complice", "un pote, pas un coach"], ["Clair", "phrases courtes"], ["Encourageant", "la régularité, pas la perfection"]].map(([t, d]) => `<div style="background:${C.green};color:${C.paper};border-radius:16px;padding:18px"><b style="font-size:21px">${t}</b><div style="font-size:14px;color:${C.stone};margin-top:4px">${d}</div></div>`).join("")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px;font-size:16px">
      ${[["Félicitations !!! Vous avez complété votre session avec succès !", "+25 briques pour ton île."], ["Vous n'avez pas travaillé hier, votre série est perdue.", "Nouvelle série : c'est reparti."], ["Boostez votre productivité grâce à notre solution innovante.", "Tout ton semestre, une seule app."]]
        .map(([no, yes]) => `<div style="background:#fbe9e4;border-radius:14px;padding:14px 18px;color:#8e2a18">✕ ${no}</div><div style="background:#e5efe8;border-radius:14px;padding:14px 18px;color:${C.green}">✓ ${yes}</div>`).join("")}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:22px">
      ${card(`<span class="tag">On dit</span><div style="display:flex;flex-wrap:wrap;gap:8px">${["focus", "session lock in", "briques", "ton île", "série", "séances"].map((w) => `<span style="background:#e5efe8;color:${C.green};border-radius:999px;padding:6px 14px;font-weight:600">${w}</span>`).join("")}</div>`)}
      ${card(`<span class="tag">On évite</span><div style="display:flex;flex-wrap:wrap;gap:8px">${["points", "crédits", "coins", "révolutionnaire", "boostez", "!!!"].map((w) => `<span style="background:#fbe9e4;color:#8e2a18;border-radius:999px;padding:6px 14px;font-weight:600;text-decoration:line-through">${w}</span>`).join("")}</div>`)}</div>
    <p class="small" style="margin-top:14px">On tutoie, on fait court, on ne culpabilise jamais. Police : Inter.</p>`),

  /* 7 · l'app */
  page(7, `${kicker(7)}${h("Tout le semestre, une seule app.")}
    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:18px;margin-top:16px;height:470px">
      ${shot(SHOT("home-light.jpg"), "height:470px;object-fit:cover;object-position:left top")}
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[["Accueil", "ta journée en un coup d'œil"], ["Tâches", "à faire, en cours, terminé"], ["Habitudes", "séries et taux sur 30 jours"], ["Notes", "plusieurs pages, sauvegarde auto"], ["Séances", "le planning de la semaine"], ["Carnet", "la moyenne pondérée"], ["Focus", "sessions lock in"]].map(([t, d], k) => `<div style="display:flex;gap:12px;align-items:center;background:#fffdf8;border:1px solid ${C.line};border-radius:12px;padding:9px 14px"><span class="mono" style="color:${C.sunText};font-size:13px">0${k + 1}</span><b style="font-size:16px">${t}</b><span style="font-size:13px;color:${C.muted};margin-left:auto">${d}</span></div>`).join("")}
        <p class="small" style="margin-top:4px">Gratuit · ordinateur et téléphone · hors ligne · compte facultatif.</p></div></div>`),

  /* 8 · l'île */
  page(8, `${kicker(8)}${h("Chaque minute de focus fait pousser ton île.")}
    <div style="display:grid;grid-template-columns:1fr 1.5fr;gap:18px;margin-top:16px;height:430px">
      ${shot(SHOT("focus-light.jpg"), "height:430px;object-fit:cover;object-position:left top")}
      ${shot(SHOT("island-editor.jpg"), "height:430px;object-fit:cover;object-position:left top")}</div>
    <p class="small" style="margin-top:12px">Lance une session, gagne des briques, dépense-les : 14 éléments à débloquer, une île de 6×6 à 9×9 cases.</p>`),

  /* 9 · en parler */
  page(9, `${kicker(9)}${h("Comment en parler.")}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:14px">
      ${card(`<span class="tag">En 5 mots</span><b style="font-size:26px;color:${C.green}">L'app de focus des étudiants.</b>`)}
      ${card(`<span class="tag">La signature</span><b style="font-size:26px;color:${C.green}">Make focus addictive.</b><span class="small">toujours en anglais, avec le point · <b style="color:${C.zen}">#Fonsai #MakeFocusAddictive</b></span>`)}</div>
    ${card(`<span class="tag">En une phrase</span><span style="font-size:18px;line-height:1.5">Fonsai réunit planning, tâches, habitudes, notes, moyenne et minuteur de focus dans une seule app pour étudiants, et transforme chaque minute de concentration en briques pour construire son île zen.</span>`, "margin-top:18px")}
    ${card(`<span class="tag">À l'oral, 30 secondes</span><span style="font-size:16px;line-height:1.55;color:${C.fg2}">« Tu connais le problème : un agenda ici, une to-do là, un tableur pour la moyenne… et au bout de deux semaines on lâche tout. Fonsai met tout ça dans une seule app. Et surtout, chaque minute où tu te concentres te rapporte une brique pour construire ta propre île japonaise en 3D. C'est gratuit : fonsai.app. »</span>`, "margin-top:18px")}
    <p class="small" style="margin-top:14px">Toutes les versions (paragraphe, page entière, anglais, bios, messages types) sont dans le dossier 04-textes du kit.</p>`),

  /* 10 · les réseaux */
  page(10, `${kicker(10)}${h("Prêt pour les réseaux.")}
    <div style="display:grid;grid-template-columns:150px 1fr;gap:18px;margin-top:14px;align-items:start">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px"><img src="${SOC("photo-profil-1080.png")}" style="width:130px;height:130px;border-radius:50%"><span class="small">@fonsai</span></div>
      ${shot(SOC("banniere-linkedin-1584x396.png"))}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 0.56fr;gap:18px;margin-top:18px;height:330px">
      ${shot(SOC("post-instagram-signature-1080.png"), "height:330px;object-fit:cover")}${shot(SOC("post-instagram-ile-1080.png"), "height:330px;object-fit:cover")}${shot(SOC("story-1080x1920.png"), "height:330px;object-fit:cover")}</div>`),

  /* 11 · la suite */
  page(11, `${kicker(11)}${h("Et maintenant : les premiers utilisateurs.")}
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px">
      ${[["1", "Mesurer", "Statistiques de visite et bouton « Donner mon avis »."], ["2", "10 premiers", "Ta promo, tes potes. Regarde-les utiliser l'app."], ["3", "Montrer l'île", "Une vidéo de 20 s : un pomodoro, l'île qui grandit."], ["4", "Grandir", "Le social, l'anglais, puis les décors premium."]]
        .map(([n, t, d]) => `<div style="background:#fffdf8;border:1px solid ${C.line};border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px"><div style="width:42px;height:42px;border-radius:50%;background:${C.sun};color:#fff;display:grid;place-items:center;font-weight:800;font-size:19px">${n}</div><b style="font-size:20px;color:${C.green}">${t}</b><span style="font-size:15px;line-height:1.5;color:${C.fg2}">${d}</span></div>`).join("")}</div>
    <p class="big" style="margin-top:46px">Une seule question compte :<br><span style="color:${C.zen}">est-ce que les gens reviennent le lendemain ?</span></p>`),

  /* 12 · dos */
  page(12, `<div style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;text-align:center">
    <img src="${SYM("creme")}" style="width:110px">
    <div style="font-weight:800;font-size:70px;letter-spacing:-.045em;color:${C.paper}">fonsai.app</div>
    <div style="width:120px;height:120px;background:${C.paper};border-radius:16px;padding:14px">${QR.replace("<svg", '<svg width="92" height="92"')}</div>
    <div style="font-size:17px;color:${C.stone};line-height:1.7">Presse et kit de marque : fonsai.app/presse<br>Contact : contact@fonsai.app</div></div>`, { bg: C.green, dark: true }),
];

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
@page{size:1123px 794px;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
section{width:1123px;height:794px;padding:58px 72px 90px;position:relative;overflow:hidden;page-break-after:always}
section:last-child{page-break-after:auto}
.k{font-family:'JetBrains Mono';font-size:13px;color:${C.sunText};letter-spacing:.06em;text-transform:uppercase}
h2{font-size:46px;font-weight:800;letter-spacing:-.04em;line-height:1.02;color:${C.green};margin:8px 0 12px;max-width:900px}
.lead{font-size:20px;line-height:1.55;color:${C.fg2};max-width:820px}
.big{font-weight:800;font-size:36px;letter-spacing:-.03em;line-height:1.15;color:${C.ink}}
.small{font-size:14px;color:${C.muted}}
.mono{font-family:'JetBrains Mono'}
.card{background:#fffdf8;border:1px solid ${C.line};border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:8px}
.tag{font-family:'JetBrains Mono';font-size:12px;color:${C.sunText};text-transform:uppercase;letter-spacing:.06em}
.shot{display:block;width:100%;border-radius:16px;border:1px solid ${C.line}}
</style></head><body>${pages.join("")}</body></html>`;

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const tab = await browser.newPage();
await tab.setViewport({ width: 1123, height: 794 });
await tab.setContent(html, { waitUntil: "load", timeout: 60000 });
await tab.evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]));
const out = K("06-documents/livret-fonsai.pdf");
await tab.pdf({ path: out, width: "1123px", height: "794px", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
if (process.env.MARQUE_PREVIEW) for (let k = 0; k < pages.length; k++) await tab.screenshot({ path: resolve(process.env.MARQUE_PREVIEW, `livret-${String(k).padStart(2, "0")}.png`), clip: { x: 0, y: k * 794, width: 1123, height: 794 }, captureBeyondViewport: true });
await browser.close();
console.log("✓ 06-documents/livret-fonsai.pdf");
