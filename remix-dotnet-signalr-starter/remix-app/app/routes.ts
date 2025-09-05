import { type RouteConfig, index, route } from "@react-router/dev/routes";

// After deleting the former top-level component files, the live-comm and
// charting-poc routes are now served by their folder `_index.tsx` files.
// Update the route config to point at the existing files so navigation works again.
export default [
  index("routes/_index.tsx"),
  route("/api/health", "routes/api.health.ts"),
  route("/live-comm", "routes/live-comm/_index.tsx"),
  route("/charting-poc", "routes/charting-poc/_index.tsx"),
] satisfies RouteConfig;
