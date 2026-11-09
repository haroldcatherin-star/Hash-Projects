# HashProjects

L'app des étudiants : planning, tâches, habitudes, notes, moyenne et focus, avec une île à construire.

## Structure

| Chemin | Contenu |
|---|---|
| `/` (`index.html`) | Le site de présentation |
| `/app/` (`app/index.html`) | L'application |
| `assets/` | Captures, visuels et feuille de style partagée (`site.css`) |
| `a-propos/`, `contact/` | Pages d'information |
| `mentions-legales/`, `confidentialite/`, `conditions/` | Pages légales |
| `404.html` | Page affichée pour une adresse inconnue |
| `wrangler.jsonc`, `.assetsignore` | Configuration Cloudflare (404, fichiers non publiés) |

## Redirection automatique

Un visiteur qui a déjà ouvert l'app sur cet appareil est envoyé directement sur `/app/` quand il tape l'adresse du site.
L'app note `hp_open_app` dans le navigateur à chaque ouverture ; le site vérifie cette valeur (ou la présence de données `hashprojects_*`).

Pour revoir le site malgré tout : ajouter `?accueil` à l'adresse (ex. `https://hashprojects.trade/?accueil`).
Dans l'app, le mot « HashProjects » en haut à gauche ramène au site.

## Mise en ligne

Site 100 % statique, publié par Cloudflare (Worker `hash-projects`) à chaque changement sur `main`.
