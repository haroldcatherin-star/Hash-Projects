// Données de démo pour les captures d'écran du site (scripts/captures.mjs).
// Tout est calculé à partir de `now` : un semestre réaliste d'étudiant·e, autour de la semaine en cours.

function ymd(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function shift(now, days) { const d = new Date(now); d.setDate(d.getDate() + days); return d; }

// Pseudo-aléatoire déterministe : les captures sont identiques à chaque génération.
function rng(seed) { let s = seed; return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); }

export function demoData(now) {
  const today = ymd(now);
  const day = (n) => ymd(shift(now, n));
  const dow = (now.getDay() + 6) % 7; // 0 = lundi
  const monday = (n) => ymd(shift(now, n - dow)); // n-ième jour de la semaine en cours
  const rand = rng(42);

  /* ---------- tâches ---------- */
  const tasks = [
    { id: 1, text: "Fiche de synthèse — chapitre 3 d'analyse", status: "doing", date: today },
    { id: 2, text: "Rendre le TP de physique (ondes)", status: "todo", date: day(2) },
    { id: 3, text: "Préparer l'oral blanc d'anglais", status: "todo", date: day(1) },
    { id: 4, text: "Exercices 12 à 18 — suites et séries", status: "todo", date: null },
    { id: 5, text: "Projet algo : tests unitaires", status: "doing", date: day(5) },
    { id: 6, text: "Imprimer les annales de partiel", status: "todo", date: null },
    { id: 7, text: "Relire le cours de thermodynamique", status: "done", date: day(-1) },
    { id: 8, text: "Inscription au tournoi de foot", status: "done", date: day(-2) },
    { id: 9, text: "Réserver une salle à la BU", status: "done", date: day(-1) },
  ];
  const history = [
    { text: "Relire le cours de thermodynamique", time: "hier, 21:10" },
    { text: "Réserver une salle à la BU", time: "hier, 18:42" },
    { text: "Inscription au tournoi de foot", time: "avant-hier, 12:05" },
  ];

  /* ---------- habitudes : 70 jours d'historique ---------- */
  const habitDefs = [
    ["Réviser les cours du jour", "Académique", 0.95],
    ["Faire les exercices / devoirs", "Académique", 0.85],
    ["Relire mes notes (active recall)", "Académique", 0.7],
    ["Dormir avant minuit", "Santé", 0.75],
    ["Boire assez d'eau", "Santé", 0.9],
    ["Entraînement / sport", "Santé", 0.5],
    ["Préparer sac + planning du lendemain", "Discipline", 0.8],
    ["Zéro réseaux sociaux avant le travail fini", "Discipline", 0.55],
  ];
  const habits = habitDefs.map(([name, category], i) => ({ id: "h" + (i + 1), name, category, createdAt: day(-70), active: true }));
  const logs = {};
  const streakDays = [21, 12, 4, 9, 33, 0, 6, 3]; // série en cours de chaque habitude (jours avant aujourd'hui)
  for (let n = -69; n <= -1; n++) {
    const k = day(n); logs[k] = {};
    const perfect = n >= -3 || n % 6 === 0; // des « jours parfaits » : les 3 derniers, puis de temps en temps
    habits.forEach((h, i) => {
      if (perfect || -n <= streakDays[i]) { logs[k][h.id] = true; return; }
      if (-n === streakDays[i] + 1) { logs[k][h.id] = "no"; return; } // ce qui a cassé la série précédente
      const r = rand(); if (r < habitDefs[i][2]) logs[k][h.id] = true; else if (r < habitDefs[i][2] + 0.1) logs[k][h.id] = "no";
    });
  }
  logs[today] = { h1: true, h2: true, h4: true, h5: true, h7: true }; // 5/8 aujourd'hui

  /* ---------- notes ---------- */
  const notes = {
    active: "n1",
    pages: [
      { id: "n1", name: "Analyse — chapitre 3", updatedAt: now.getTime() - 40 * 60000, text:
`Intégrales — à retenir

• Primitive : F' = f sur un intervalle.
• Intégration par parties : ∫ u v' = [u v] − ∫ u' v
• Changement de variable : poser t = φ(x), ne pas oublier dt = φ'(x) dx.

Méthode pour les exos :
1. Repérer la forme (produit ? composée ?)
2. Choisir u = ce qui se simplifie en dérivant
3. Vérifier en dérivant le résultat

À revoir avant le partiel : intégrales impropres, critère de Riemann.` },
      { id: "n2", name: "Physique — ondes", updatedAt: now.getTime() - 86400000, text:
`Équation d'onde : ∂²y/∂t² = c² ∂²y/∂x²
Célérité sur une corde : c = √(T/μ)
Ondes stationnaires : nœuds tous les λ/2.

TP du jeudi : mesurer λ avec la cuve à ondes, incertitude-type sur 10 mesures.` },
      { id: "n3", name: "Idées projet", updatedAt: now.getTime() - 3 * 86400000, text:
`Projet algo — idées
- Solveur de sudoku (backtracking)
- Plus court chemin dans le métro (Dijkstra)
- Générateur de labyrinthes

→ Dijkstra : le plus utile pour l'oral.` },
    ],
  };

  /* ---------- séances (planning de la semaine) ---------- */
  let sid = 0;
  const ses = (date, time, name, duration, status) => ({
    id: "s" + (++sid), name, date, time, duration, status, doneAt: status === "done" ? date : null, created: now.getTime() - sid * 1000,
    ...(/^pause\b/i.test(name) ? { kind: "pause" } : {}),
  });
  const sessions = [];
  const week = [
    [["08:30", "Analyse — exercices intégrales", 90], ["10:30", "Physique — cours ondes", 75], ["14:00", "Algo — projet", 120]],
    [["09:00", "Anglais — vocabulaire", 45], ["10:00", "Analyse — fiche chapitre 2", 60], ["15:00", "Physique — exercices", 90]],
    [["08:30", "Analyse — chapitre 3 (intégrales)", 90], ["10:15", "Pause café", 15], ["10:30", "Physique — TD ondes", 75], ["14:00", "Anglais — oral blanc", 90], ["16:00", "Algo — exercices récursivité", 50]],
    [["09:00", "Algo — tests unitaires", 90], ["14:00", "Analyse — annales", 120]],
    [["08:30", "Physique — TP cuve à ondes", 120], ["14:00", "Révision générale", 90]],
  ];
  week.forEach((slots, d) => {
    const date = monday(d);
    slots.forEach(([time, name, dur]) => {
      const past = date < today || (date === today && time < "16:00");
      sessions.push(ses(date, time, name, dur, past ? "done" : "planned"));
    });
  });
  for (let w = 1; w <= 7; w++) for (let d = 0; d < 5; d++) { // semaines précédentes, pour l'historique
    const date = ymd(shift(now, d - dow - 7 * w));
    sessions.push(ses(date, "09:00", ["Analyse", "Physique", "Algo", "Anglais", "Révisions"][d] + " — travail perso", 60 + Math.round(rand() * 4) * 15, "done"));
  }
  sessions.push(ses(null, null, "Refaire les exos ratés du DM", 45, "todo"));
  sessions.push(ses(null, null, "Fiche méthode — équations différentielles", 60, "todo"));
  const planner = {
    sessions,
    events: [
      { id: "e1", title: "Partiel d'analyse", start: day(4), end: day(4) },
      { id: "e2", title: "Rendu projet algo", start: day(6), end: day(6) },
      { id: "e3", title: "Match de foot", start: day(2), end: day(2) },
    ],
  };

  /* ---------- focus : 30 jours de pomodoros, série de 6 jours ---------- */
  const focusHistory = {};
  for (let n = -29; n <= 0; n++) {
    if (n >= -5 || rand() < 0.7) { const p = n === 0 ? 3 : 2 + Math.floor(rand() * 5); focusHistory[day(n)] = { n: p, min: p * 25 }; }
  }
  delete focusHistory[day(-6)]; // la série démarre il y a 6 jours
  const focus = { settings: { focus: 25, short: 5, long: 15, every: 4, auto: false, sound: true, tick: false }, history: focusHistory, cycle: 3, plan: null };

  /* ---------- carnet de notes ---------- */
  let gid = 0; const g = (label, value, max, coef) => ({ id: "g" + (++gid), label, value, max, coef });
  const carnet = {
    scale: 20,
    subjects: [
      { id: "c1", name: "Analyse", coef: 4, grades: [g("DS 1", 13.5, 20, 1), g("Interro", 8, 10, 0.5), g("DS 2", 11, 20, 1)] },
      { id: "c2", name: "Physique", coef: 3, grades: [g("TP noté", 16, 20, 1), g("Contrôle", 12, 20, 2)] },
      { id: "c3", name: "Algorithmique", coef: 3, grades: [g("Projet 1", 17, 20, 1), g("QCM", 14, 20, 1)] },
      { id: "c4", name: "Anglais", coef: 2, grades: [g("Oral", 15, 20, 1), g("Compréhension", 78, 100, 1)] },
      { id: "c5", name: "Chimie", coef: 2, grades: [g("Contrôle", 10.5, 20, 1)] },
    ],
  };

  /* ---------- île : bien remplie, pour donner envie ---------- */
  const island = {
    N: 9, bricks: 340, earned: 9200, light: "auto",
    tiles: {
      "1,1": { id: "pagode", r: 0 }, "7,1": { id: "chateau", r: 3 }, "4,1": { id: "torii", r: 0 },
      "1,4": { id: "the", r: 1 }, "7,4": { id: "sanctuaire", r: 3 }, "1,7": { id: "minka", r: 1 },
      "7,7": { id: "bouddha", r: 2 }, "4,7": { id: "cloche", r: 0 }, "2,2": { id: "cerisier", r: 0 },
      "6,2": { id: "cerisier", r: 0 }, "2,6": { id: "pin", r: 0 }, "6,6": { id: "cerisier", r: 0 },
      "0,0": { id: "bambou", r: 0 }, "8,0": { id: "bambou", r: 0 }, "0,8": { id: "bambou", r: 0 },
      "8,8": { id: "pin", r: 0 }, "3,3": { id: "lanterne", r: 0 }, "5,5": { id: "lanterne", r: 0 },
      "2,4": { id: "karesansui", r: 0 }, "6,4": { id: "potager", r: 0 }, "0,4": { id: "pin", r: 0 },
    },
  };

  return {
    hashprojects_tasks_v1: tasks,
    hashprojects_history_v1: history,
    hashprojects_habits_v1: { habits, logs },
    hashprojects_notes_v1: notes,
    hashprojects_planner_v1: planner,
    hashprojects_focus_v1: focus,
    hashprojects_carnet_v1: carnet,
    hashprojects_island_v1: island,
  };
}
