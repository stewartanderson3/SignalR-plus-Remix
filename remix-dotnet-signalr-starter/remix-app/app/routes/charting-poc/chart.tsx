import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React from 'react';

const seriesA = [
  { x: 20, y: 12 },
  { x: 30, y: 18 },
  { x: 40, y: 15 },
  { x: null, y: null },
  { x: 60, y: 19 },
  { x: 70, y: 14 },
  { x: 80, y: 22 },
];

const seriesB = [
  { x: 10, y: 28 },
  { x: 25, y: 32 },
  { x: 45, y: 30 },
  { x: 55, y: 35 },
  { x: 60, y: 31 },
];

const xDomain: [number, number] = [0, 100];
const mergedForAxis = [...seriesA, ...seriesB];

export default function ChartingPOC() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.5, padding: 24 }}>
      <h1>Charting POC</h1>
      <p>Mid-span lines (don&apos;t touch edges) and a deliberate gap using a null y value.</p>
      <div style={{ width: '100%', height: 360, maxWidth: 860, borderRadius: 8, padding: 8 }}>
        <ResponsiveContainer>
          <LineChart data={mergedForAxis}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={xDomain} tick={{ fontSize: 12 }} />
            <YAxis type="number" domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#f9fafb', boxShadow: '0 4px 10px rgba(0,0,0,.25)', padding: '8px 10px' }}
              itemStyle={{ color: '#f9fafb', fontSize: 12, lineHeight: 1.2 }}
              labelStyle={{ color: '#93c5fd', fontSize: 11, fontWeight: 500, marginBottom: 4 }}
              cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }}
              wrapperStyle={{ outline: 'none' }}
            />
            <Legend />
            <Line
              name="Series A (gap & mid-span)"
              data={seriesA}
              dataKey="y"
              type="monotone"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5, stroke: '#2563eb', strokeWidth: 2 }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              name="Series B (shorter span)"
              data={seriesB}
              dataKey="y"
              type="monotone"
              stroke="#dc2626"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={{ r: 4, stroke: '#dc2626', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ fontSize: 14, marginTop: 12 }}>
        <li>Domain set to [0,100]; Series A only occupies 20-80, Series B 10-60.</li>
        <li>Series A gap created by a null y at x=50 (no connecting segment).</li>
        <li>To pad automatically you could use domain={[`dataMin - 10`, `dataMax + 10`]} instead of a fixed array.</li>
        <li>Each <code>Line</code> gets its own <code>data</code>; the chart-level <code>data</code> only informs scales.</li>
      </ul>
      <p style={{ marginTop: 16 }}><a href="/">Back to landing</a></p>
    </main>
  );
}
