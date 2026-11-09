# HashProjects

L'app des étudiants : planning, tâches, habitudes, notes, moyenne et focus, avec une île à construire.

## Structure

| Chemin | Contenu |
|---|---|
| `/` (`index.html`) | Le site de présentation |
| `/app/` (`app/index.html`) | L'application |
| `assets/` | Captures et visuels du site |

## Redirection automatique

Un visiteur qui a déjà ouvert l'app sur cet appareil est envoyé directement sur `/app/` quand il tape l'adresse du site.
L'app note `hp_open_app` dans le navigateur à chaque ouverture ; le site vérifie cette valeur (ou la présence de données `hashprojects_*`).

Pour revoir le site malgré tout : ajouter `?accueil` à l'adresse (ex. `https://exemple.com/?accueil`).

## Mise en ligne

Site 100 % statique, sans étape de build : publier la racine du dépôt (Cloudflare Pages, GitHub Pages…).
