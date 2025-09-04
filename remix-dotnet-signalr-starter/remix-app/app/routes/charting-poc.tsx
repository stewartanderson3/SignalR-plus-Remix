import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React from 'react';

// Demonstrate:
// 1. Lines that start/end away from the left/right domain edges (mid-span rendering)
// 2. A gap in a line created with a null y (break in the path)

// Series A spans x = 20 -> 80 and includes a gap (null) between x=50 (null) which splits the polyline.
const seriesA = [
  { x: 20, y: 12 },
  { x: 30, y: 18 },
  { x: 40, y: 15 },
  { x: null, y: null }, // null breaks the line (no segment across this point)
  { x: 60, y: 19 },
  { x: 70, y: 14 },
  { x: 80, y: 22 },
];

// Series B spans x = 10 -> 60, no gap.
const seriesB = [
  { x: 10, y: 28 },
  { x: 25, y: 32 },
  { x: 45, y: 30 },
  { x: 55, y: 35 },
  { x: 60, y: 31 },
];

// Axis domain intentionally larger than either series' min/max so lines float with left/right padding.
const xDomain: [number, number] = [0, 100];
const mergedForAxis = [...seriesA, ...seriesB];

export default function ChartingPOC() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.5, padding: 24 }}>
      <h1>Charting POC</h1>
      <p>Mid-span lines (don&apos;t touch edges) and a deliberate gap using a null y value.</p>
      <div style={{ width: '100%', height: 360, maxWidth: 860, border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, background: '#ffffff' }}>
        <ResponsiveContainer>
          <LineChart data={mergedForAxis}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" domain={xDomain} tick={{ fontSize: 12 }} />
            <YAxis type="number" domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line
              name="Series A (gap & mid-span)"
              data={seriesA}
              dataKey="y"
              type="monotone"
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 5, stroke: '#2563eb', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 7 }}
              isAnimationActive={false}
              connectNulls={false} // ensures the null produces a visible gap
            />
            <Line
              name="Series B (shorter span)"
              data={seriesB}
              dataKey="y"
              type="monotone"
              stroke="#dc2626"
              strokeDasharray="5 4"
              strokeWidth={2}
              dot={{ r: 4, stroke: '#dc2626', strokeWidth: 2, fill: '#ffffff' }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ul style={{ fontSize: 14, marginTop: 12, color: '#374151' }}>
        <li>Domain set to [0,100]; Series A only occupies 20-80, Series B 10-60.</li>
        <li>Series A gap created by a null y at x=50 (no connecting segment).</li>
        <li>To pad automatically you could use domain={[`dataMin - 10`, `dataMax + 10`]} instead of a fixed array.</li>
        <li>Each <code>Line</code> gets its own <code>data</code>; the chart-level <code>data</code> only informs scales.</li>
      </ul>
      <p style={{ marginTop: 16 }}><a href="/">Back to landing</a></p>
    </main>
  );
}
