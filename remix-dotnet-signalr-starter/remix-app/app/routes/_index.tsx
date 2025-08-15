import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";

export default function Index() {
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("disconnected");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    const conn = new signalR.HubConnectionBuilder()
      .withUrl("/chathub") // proxied to .NET in dev
      .withAutomaticReconnect()
      .build();

    conn.on("ReceiveMessage", (user: string, message: string) => {
      setMessages(m => [...m, `${user}: ${message}`]);
    });

    conn.onreconnecting(() => setStatus("reconnecting"));
    conn.onreconnected(() => setStatus("connected"));
    conn.onclose(() => setStatus("disconnected"));

    conn.start()
      .then(() => setStatus("connected"))
      .catch(err => setStatus("error: " + String(err)));

    setConnection(conn);
    return () => { conn.stop(); };
  }, []);

  const send = async () => {
    if (!connection) return;
    await connection.invoke("SendMessage", "RemixUser", input);
    setInput("");
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.6", padding: 24 }}>
      <h1>Remix + .NET + SignalR</h1>
      <p>Status: <strong>{status}</strong></p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={send} disabled={!connection || !input}>Send</button>
      </div>

      <ul>
        {messages.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </main>
  );
}
