# React Router + .NET + SignalR Starter

Single-origin dev setup where **React Router v7 (Vite)** proxies to **.NET 8 + SignalR**.
- One browser port (5173) in dev.
- WebSocket upgrades proxied for SignalR (`/chathub`).
- Simple chat demo wired end-to-end.

## Prereqs
- Node 18+ (or 20+)
- .NET 8 SDK

## Getting started

### 1) Install JS deps
```bash
cd remix-app
npm install
```

### 2) Run .NET backend
```bash
cd ../dotnet-signalr
dotnet run --urls=http://localhost:5000
```

### 3) Run React Router dev (proxied)
```bash
cd ../remix-app
npm run dev
```

Open http://localhost:5173 — send a message and see it broadcast via SignalR.

## How it works
- `vite.config.ts` proxies `/api` and `/chathub` to `http://localhost:5000` with `ws: true` for WebSockets.
- React Router page connects to SignalR with a relative URL (`/chathub`) so you avoid CORS and extra ports in the browser.

## Production sketch
Terminate TLS once and route by path (Nginx/YARP/Caddy):
- `^/chathub` and `^/api` → .NET app
- everything else → React Router server (or static if you deploy React Router to a Node host)

### Nginx snippet
```nginx
location /chathub {
  proxy_pass http://dotnet:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "Upgrade";
  proxy_set_header Host $host;
}
```

## Notes
- CORS in `Program.cs` is dev-friendly; tighten for prod.
- If you prefer .NET to be the single port in dev, use YARP to reverse-proxy to Remix dev server instead.
