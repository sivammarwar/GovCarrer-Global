import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { apiPlugin } from "./vite-api-plugin";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    apiPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        /*
          CHUNK SPLITTING FIX
          The PageSpeed waterfall showed 15+ tiny JS files (~0.6–0.8 KiB each):
          ChatFloat, message-c, search, shield, chevron, circle-ch, lock,
          external-link, pin, trending-up, file-text, users, briefcase,
          file-check, calendar — all lucide-react icon chunks auto-split by Vite.

          On slow 4G each file has ~1,000ms of request overhead regardless of
          size. 15 files = ~15 seconds of wasted latency. One consolidated
          "icons" chunk costs one request.

          manualChunks groups them into 5 stable bundles:
            "vendor"   → React + React-DOM + Router (never changes, max cache TTL)
            "icons"    → all lucide-react icons (one ~25 KiB request vs 15+)
            "supabase" → Supabase client (large, infrequent changes)
            "ui"       → Radix UI + shadcn components
            "query"    → React Query
        */
        manualChunks: (id) => {
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/scheduler/")
          ) {
            return "vendor";
          }
          if (id.includes("lucide-react")) {
            return "icons";
          }
          if (id.includes("@supabase") || id.includes("/supabase/")) {
            return "supabase";
          }
          if (
            id.includes("@radix-ui") ||
            id.includes("cmdk") ||
            id.includes("class-variance-authority") ||
            id.includes("@floating-ui")
          ) {
            return "ui";
          }
          if (id.includes("@tanstack/react-query")) {
            return "query";
          }
        },
      },
    },
    // Raise warning threshold — icons chunk will be ~25 KiB gzipped, which is fine.
    chunkSizeWarningLimit: 600,
    minify: "esbuild",
    sourcemap: false,
    target: "es2020",
  },
}));
