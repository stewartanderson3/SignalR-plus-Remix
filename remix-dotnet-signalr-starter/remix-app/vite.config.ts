import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { reactRouter } from "@react-router/dev/vite";

export default defineConfig({
  plugins: [reactRouter(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
        secure: false // Allow self-signed certificates in development
      },
      "/chathub": {
        target: "http://localhost:5001",
        ws: true, // WebSocket upgrade for SignalR
        changeOrigin: true,
        secure: false // Allow self-signed certificates in development
      }
    }
  },
  build: { target: "es2022" }
});
