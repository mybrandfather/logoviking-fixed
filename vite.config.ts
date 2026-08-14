import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Packages we deliberately keep OUT of the bundle. They are loaded from a CDN
// at runtime, on-demand, only when the user opens the matching tool.
// This keeps the main bundle small and Lighthouse-friendly.
const externalRuntimeOnly = ["@imgly/background-removal"];

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    // Don't pre-bundle these in dev — they'll be loaded from CDN at runtime
    exclude: externalRuntimeOnly,
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 4096,
    copyPublicDir: true,
    rollupOptions: {
      // Treat these as external — Rollup won't try to bundle them
      external: (id) => externalRuntimeOnly.some((pkg) => id === pkg || id.startsWith(`${pkg}/`)),
    },
  },
});
