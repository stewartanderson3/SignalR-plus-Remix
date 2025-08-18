import { createRequestHandler } from "react-router";
import { broadcastDevReady } from "react-router";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? null
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const app = express();

// Add proxy middleware for API calls
app.use(
  "/api",
  createProxyMiddleware({
    target: "https://localhost:5001",
    changeOrigin: true,
    secure: false,
  })
);

// Add proxy middleware for SignalR
app.use(
  "/chathub",
  createProxyMiddleware({
    target: "https://localhost:5001",
    changeOrigin: true,
    secure: false,
    ws: true, // WebSocket support
  })
);

app.use(
  viteDevServer
    ? viteDevServer.middlewares
    : express.static("build/client")
);

const build = viteDevServer
  ? () =>
      viteDevServer.ssrLoadModule(
        "virtual:react-router/server-build"
      )
  : await import("./build/server/index.js");

app.all("*", createRequestHandler({ build }));

const port = process.env.PORT || 5173;
app.listen(port, () => {
  console.log(`App listening on http://localhost:${port}`);

  if (process.env.NODE_ENV === "development") {
    broadcastDevReady(build);
  }
});
