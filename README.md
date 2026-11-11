# Fonsai

**Fonsai, make focus addictive.** · [fonsai.app](https://fonsai.app)

L'app des étudiants : planning, tâches, habitudes, notes, moyenne et focus, autour d'une
**île zen en 3D qui grandit avec ton focus** : chaque minute de concentration rapporte des briques
à dépenser en décor (cerisier, bonsaï, torii, pagode…).

## Lancer le projet

Prérequis : [Node.js](https://nodejs.org) LTS.

```bash
npm install
npm run dev       # serveur de dev sur http://localhost:5173 (site sur /, app sur /app/)
npm run build     # build de production dans dist/
npm run preview   # sert dist/ en local
```

## Structure

| Chemin | Contenu |
|---|---|
| `index.html` → `/` | Le site de présentation |
| `app/index.html` → `/app/` | L'application (structure de la page) |
| `a-propos/`, `contact/` | Pages d'information |
| `mentions-legales/`, `confidentialite/`, `conditions/` | Pages légales |
| `404.html` | Page affichée pour une adresse inconnue |
| `src/styles/app.css` | Styles de l'app |
| `public/app/js/` | Code de l'app, un script par module (voir ci-dessous) |
| `public/app/sw.js`, `public/app/manifest.webmanifest` | App installable et utilisable hors ligne |
| `public/assets/` | Captures, visuels et feuille de style du site (`site.css`) |
| `public/favicon.svg`, `public/apple-touch-icon.png` | Icône bonsaï |
| `public/_headers` | En-têtes HTTP |
| `wrangler.jsonc` | Configuration Cloudflare (publie `dist/`, page 404) |

Scripts de l'app, chargés dans cet ordre :

| Fichier | Rôle |
|---|---|
| `i18n.js` | Traductions : `i18n.t("clé")`, attributs `data-i18n="clé"` |
| `core.js` | Stockage, tâches, habitudes, notes, navigation, export/import |
| `personnaliser.js` | Couleurs, ordre des onglets, préférences |
| `seances.js` | Planning des séances |
| `focus.js` | Minuteur Pomodoro / session lock in |
| `carnet.js` | Matières et moyennes |
| `ile.js` | Île zen 3D (Three.js) et économie de briques |
| `accueil.js` | Vue « Aujourd'hui » |
| `synchro.js` | Compte et synchro (Supabase) |

Ce sont des **scripts classiques** qui partagent des variables globales (et sont appelés par des
`onclick="…"` dans le HTML). Vite les copie tels quels ; ils seront migrés un par un en modules ES.

## Données

- Stockées dans le `localStorage` (clés `hashprojects_*_v1`, gardées telles quelles pour ne perdre
  aucune donnée existante ni casser la synchro), synchronisées via Supabase (table `hp_data`,
  une ligne par module et par utilisateur) quand on est connecté.

## Redirection automatique

Un visiteur qui a déjà ouvert l'app sur cet appareil est envoyé directement sur `/app/` quand il tape l'adresse du site.
L'app note `hp_open_app` dans le navigateur à chaque ouverture ; le site vérifie cette valeur (ou la présence de données `hashprojects_*`).

Pour revoir le site malgré tout : ajouter `?accueil` à l'adresse (ex. `https://fonsai.app/?accueil`).
Dans l'app, le mot « Fonsai » en haut à gauche ramène au site.

## Mise en ligne

Publié par Cloudflare (Worker `hash-projects`, Workers Builds) à chaque changement sur `main`.
Réglages du build dans Cloudflare : **Build command** `npm run build` ; `wrangler.jsonc` publie `dist/`.
