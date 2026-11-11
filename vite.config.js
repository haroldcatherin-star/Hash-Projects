import { defineConfig } from "vite";
import { resolve } from "node:path";

// Site de présentation à la racine, application dans /app/.
// Les scripts de l'app (public/app/js/) sont des scripts classiques (variables globales partagées,
// handlers onclick="…" dans le HTML) : Vite les copie tels quels dans dist/.
// Les images et la feuille de style du site (public/assets/) sont aussi copiées telles quelles.
const pages = [
  "index.html",
  "app/index.html",
  "404.html",
  "a-propos/index.html",
  "contact/index.html",
  "conditions/index.html",
  "confidentialite/index.html",
  "mentions-legales/index.html",
  "presse/index.html",
];

export default defineConfig({
  appType: "mpa",
  server: { port: 5173, open: false },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    assetsDir: "_build",
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p.replace(/\/?index\.html$|\.html$/, "") || "home", resolve(import.meta.dirname, p)])),
    },
  },
});
