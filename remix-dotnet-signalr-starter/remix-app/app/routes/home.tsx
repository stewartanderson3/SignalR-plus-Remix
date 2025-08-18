import { useEffect, useState, useRef } from "react";
import { useLoaderData } from "react-router-dom";
import * as signalR from "@microsoft/signalr";

export async function loader() {
  // Generate a random number server-side (simulating a database query)
  const randomNumber = Math.floor(Math.random() * 1000) + 1;
  const serverTimestamp = new Date().toISOString();
  
  return {
    randomNumber,
    serverTimestamp,
  };
}

export default function Home() {
  const { randomNumber, serverTimestamp } = useLoaderData<typeof loader>();
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState("disconnected");
  const connectionRef = useRef<signalR.HubConnection | null>(null);
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

    connectionRef.current = conn;
    return () => { conn.stop(); };
  }, []);

  const send = async () => {
    if (!connectionRef.current) return;
    await connectionRef.current.invoke("SendMessage", "ReactRouterUser", input);
    setInput("");
  };

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.6", padding: 24 }}>
      <h1>React Router + .NET + SignalR</h1>
      
      <div style={{ background: "#f0f8ff", padding: 16, marginBottom: 16, borderRadius: 8 }}>
        <h3>Server-side Data:</h3>
        <p><strong>Random Number:</strong> {randomNumber}</p>
        <p><strong>Generated at:</strong> {new Date(serverTimestamp).toLocaleString()}</p>
      </div>
      
      <p>Status: <strong>{status}</strong></p>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={send} disabled={!connectionRef.current || !input}>Send</button>
      </div>

      <ul>
        {messages.map((m, i) => <li key={i}>{m}</li>)}
      </ul>
    </main>
  );
}
