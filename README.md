# Fonsai

**Fonsai, make focus addictive.** · [fonsai.app](https://fonsai.app)

Pomodoro, tâches, habitudes, notes, planning de séances et carnet de notes, autour d'une
**île zen en 3D qui grandit avec ton focus** : chaque minute de concentration rapporte des briques
à dépenser en décor (cerisier, bonsaï, torii, pagode…).

## Lancer le projet

Prérequis : [Node.js](https://nodejs.org) LTS.

```bash
npm install
npm run dev       # serveur de dev sur http://localhost:5173
npm run build     # build de production dans dist/
npm run preview   # sert dist/ en local
```

## Structure

```
index.html              structure de la page (tous les modules)
src/styles/app.css      styles
public/
  js/                   scripts de l'app, chargés dans cet ordre :
    i18n.js             traductions — i18n.t("clé"), data-i18n="clé"
    core.js             stockage, tâches, habitudes, notes, navigation, export/import
    personnaliser.js    couleurs, ordre des onglets, préférences
    seances.js          planning des séances
    focus.js            minuteur Pomodoro / session lock in
    carnet.js           matières et moyennes
    ile.js              île zen 3D (Three.js) et économie de briques
    accueil.js          vue « Aujourd'hui »
    synchro.js          synchro du compte (Supabase)
  sw.js                 service worker (hors ligne)
  manifest.webmanifest  PWA installable
  icons/                icône
  _headers              en-têtes Cloudflare Pages
```

Les scripts de `public/js/` sont des **scripts classiques** qui partagent des variables globales
(et sont appelés par des `onclick="…"` dans le HTML). Vite les copie tels quels. Ils seront migrés
un par un en modules ES dans `src/`.

## Données

- Stockées dans le `localStorage` (clés `hashprojects_*_v1`, gardées telles quelles pour ne perdre
  aucune donnée existante ni casser la synchro), synchronisées via Supabase (table `hp_data`,
  une ligne par module et par utilisateur) quand on est connecté.

## Déploiement — Cloudflare Pages

- Build command : `npm run build`
- Output directory : `dist`
- Domaine personnalisé : `fonsai.app`
