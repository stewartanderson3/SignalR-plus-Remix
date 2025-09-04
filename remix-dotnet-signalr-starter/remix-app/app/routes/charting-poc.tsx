import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React from 'react';

// Two lines where EACH point has its own (x,y); not horizontal.
const lineA = [
  { x: 0, y: 12 },
  { x: 5, y: 18 },
  { x: 15, y: 10 },
  { x: 25, y: 22 },
  { x: 35, y: 17 },
  { x: 40, y: 24 },
];

const lineB = [
  { x: 0, y: 30 },
  { x: 8, y: 28 },
  { x: 16, y: 34 },
  { x: 24, y: 27 },
  { x: 32, y: 36 },
  { x: 40, y: 32 },
];

// Merge to drive axes; dedupe on x if needed.
const merged = [...lineA, ...lineB].sort((a, b) => a.x - b.x);
const xDomain: [number, number] = [0, 40];

export default function ChartingPOC() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.5, padding: 24 }}>
      <h1>Charting POC</h1>
      <p>Two lines with varying y values across points (not horizontal).</p>
      <div style={{ width: '100%', height: 340, maxWidth: 820, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
        <ResponsiveContainer>
          <LineChart data={merged} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={xDomain} tick={{ fontSize: 12 }} />
            <YAxis type="number" domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              name="Series A"
              data={lineA}
              dataKey="y"
              type="monotone"
              stroke="#1d4ed8"
              strokeWidth={3}
              dot={{ r: 5, stroke: '#1d4ed8', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />
            <Line
              name="Series B"
              data={lineB}
              dataKey="y"
              type="monotone"
              stroke="#dc2626"
              strokeDasharray="6 4"
              strokeWidth={2}
              dot={{ r: 5, stroke: '#dc2626', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ fontSize: 14, marginTop: 12, color: '#374151' }}>
        <li>Each data point supplies its own y, so the lines vary vertically.</li>
        <li>Per-series styling: color, dash pattern, thickness, dots.</li>
        <li>Add/remove points by pushing objects into <code>lineA</code> / <code>lineB</code>.</li>
      </ul>
      <p><a href="/">Back to landing</a></p>
    </main>
  );
}
