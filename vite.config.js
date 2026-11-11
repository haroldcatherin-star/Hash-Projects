import { defineConfig } from "vite";

// Les scripts de public/js/ sont des scripts classiques (variables globales partagées,
// handlers onclick="…" dans le HTML) : Vite les copie tels quels dans dist/.
// On les migrera un par un en modules ES (src/) au fil du temps.
export default defineConfig({
  server: { port: 5173, open: false },
  build: { outDir: "dist", emptyOutDir: true },
});
