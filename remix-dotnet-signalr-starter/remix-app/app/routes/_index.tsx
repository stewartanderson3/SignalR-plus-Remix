import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", lineHeight: 1.6, padding: 32, maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Welcome</h1>
      <p style={{ marginTop: 0 }}>Choose an area to explore:</p>
      <nav style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
        <Link to="/live-comm" style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          <strong>Live Communication</strong>
          <div style={{ fontSize: 14, color: "#444" }}>Real-time messaging via SignalR</div>
        </Link>
        <Link to="/charting-poc" style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8, textDecoration: "none" }}>
          <strong>Charting POC</strong>
          <div style={{ fontSize: 14, color: "#444" }}>Placeholder for upcoming charts</div>
        </Link>
      </nav>
    </main>
  );
}
