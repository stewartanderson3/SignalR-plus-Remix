import { index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("/api/health", "routes/api.health.ts"),
  route("/live-comm", "routes/live-comm.tsx"),
  route("/charting-poc", "routes/charting-poc.tsx"),
];
