import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("/api/health", "routes/api.health.ts"),
] satisfies RouteConfig;
