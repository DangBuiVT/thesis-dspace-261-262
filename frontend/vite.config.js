import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  worker: { format: "es" },
  server: {
    port: 5173,
    host: "0.0.0.0",
    // Docker Desktop on Windows/macOS does not forward file events through bind mounts.
    watch: process.env.VITE_USE_POLLING === "true" ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET || process.env.VITE_API_PROXY_TARGET || "http://localhost:3000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
