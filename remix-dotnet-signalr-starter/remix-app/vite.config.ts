import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { vitePlugin as remix } from "@remix-run/dev";

export default defineConfig({
  plugins: [remix(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://localhost:5001",
        changeOrigin: true,
        secure: false // Allow self-signed certificates in development
      },
      "/chathub": {
        target: "https://localhost:5001",
        ws: true, // WebSocket upgrade for SignalR
        changeOrigin: true,
        secure: false // Allow self-signed certificates in development
      }
    }
  },
  build: { target: "es2022" }
});
