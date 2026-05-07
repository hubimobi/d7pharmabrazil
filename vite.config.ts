import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Always in the critical path — bundle together
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/react-router-dom/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/@tanstack/react-query")) {
            return "vendor-query";
          }
          // framer-motion: used in HeroSection (eagerly imported), keep in its own chunk
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          // recharts + d3: MUST NOT be in manualChunks — assigning them to a named chunk
          // causes Rollup to put the CJS interop helper (oe/_interopRequireDefault) inside
          // that chunk, then vendor-react imports it, making vendor-charts a required preload
          // on every page. Let Rollup auto-split them into lazy chunks per admin page.
          //
          // @radix-ui + lucide-react: ALSO must NOT be in manualChunks for the same reason.
          // Radix calls React.forwardRef / React.createContext at module init time.
          // When placed in a separate named chunk, Rollup does not guarantee that vendor-react
          // is evaluated first, causing: "Cannot read properties of undefined (reading 'forwardRef')"
          // → the entire app crashes on load. Let Rollup co-locate them with the components
          // that import them (lazy admin/storefront pages) via automatic code-splitting.
        },
      },
    },
    target: "es2020",
    assetsInlineLimit: 4096,
    // Warn on chunks over 500KB to catch regressions
    chunkSizeWarningLimit: 500,
  },
}));
