import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React, { useMemo } from 'react';

/**
 * A reusable financial line chart component.
 * X axis = Year (inclusive range from beginYear to endYear)
 * Y axis = Money (auto min/max with padding). Accepts multiple series and null gaps.
 */

type YearValuePoint = { year: number; value: number | null };

type SeriesInput = {
  /** Display name in legend */
  name: string;
  /** Values by year. Can be a map (object) or an explicit point array. */
  values: Record<number, number | null | undefined> | YearValuePoint[];
  /** Line color */
  color?: string;
  /** Line width */
  strokeWidth?: number;
  /** Recharts strokeDasharray e.g. '5 4' */
  strokeDasharray?: string;
  /** Whether to connect null gaps */
  connectNulls?: boolean;
};

export interface FinancialChartProps {
  beginYear: number;
  endYear: number;
  /** One or more monetary series */
  series: SeriesInput[];
  /** Optional currency code (default USD) */
  currency?: string;
  /** Label describing what the monetary value represents (used in tooltip subtitle) */
  valueLabel?: string;
  /** Height in pixels */
  height?: number;
  /** max width container style convenience */
  maxWidth?: number | string;
}

const defaultCurrencyFormatter = (currency: string) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

const toArrayPoints = (values: SeriesInput['values']): YearValuePoint[] => {
  if (Array.isArray(values)) return values;
  return Object.keys(values)
    .map((k) => ({ year: Number(k), value: values[Number(k)] ?? null }))
    .sort((a, b) => a.year - b.year);
};

export default function FinancialChart({
  beginYear,
  endYear,
  series,
  currency = 'USD',
  valueLabel,
  height = 360,
  maxWidth = 860,
}: FinancialChartProps) {
  // Normalize and guard year range
  const [minYear, maxYear] = beginYear <= endYear ? [beginYear, endYear] : [endYear, beginYear];
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);

  const normalizedSeries = useMemo(
    () =>
      series.map((s, idx) => {
        const colorPalette = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0d9488'];
        const defaultColor = colorPalette[idx % colorPalette.length];
        const points = toArrayPoints(s.values);
        // Fill in missing years with null to keep alignment (optional – Recharts handles sparse points, but this ensures tooltips show consistent year axis)
        const pointMap = new Map(points.map((p) => [p.year, p.value]));
        const filled = years.map<YearValuePoint>((y) => ({ year: y, value: pointMap.has(y) ? pointMap.get(y)! : null }));
        return {
          ...s,
            // ensure required props
          color: s.color || defaultColor,
          strokeWidth: s.strokeWidth ?? 2,
          strokeDasharray: s.strokeDasharray,
          connectNulls: s.connectNulls ?? false,
          data: filled,
        };
      }),
    [series, years]
  );

  // Compute Y min/max across all numeric values
  const yDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [];
    normalizedSeries.forEach((s) => s.data.forEach((p: YearValuePoint) => { if (typeof p.value === 'number' && isFinite(p.value)) vals.push(p.value); }));
    if (!vals.length) return [0, 1];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) {
      const pad = Math.abs(min) * 0.1 || 1;
      return [min - pad, max + pad];
    }
    const range = max - min;
    const pad = range * 0.05;
    const lower = min < 0 ? min - pad : Math.max(0, min - pad); // keep 0 floor if all positive
    return [Math.floor(lower), Math.ceil(max + pad)];
  }, [normalizedSeries]);

  const formatter = useMemo(() => defaultCurrencyFormatter(currency), [currency]);

  const axisData = useMemo(() => years.map((y) => ({ year: y })), [years]);

  const tooltipFormatter = (value: any) => (typeof value === 'number' ? formatter.format(value) : value);
  const tooltipLabelFormatter = (label: any) => `Year ${label}${valueLabel ? ` • ${valueLabel}` : ''}`;

  return (
    <div style={{ width: '100%', height, maxWidth, borderRadius: 8, padding: 8 }}>
      <ResponsiveContainer>
        <LineChart data={axisData} margin={{ top: 10, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[minYear, maxYear]}
            ticks={years}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#6b7280' }}
          />
          <YAxis
            type="number"
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(n: number) => formatter.format(n)}
            width={80}
            tickLine={false}
            axisLine={{ stroke: '#6b7280' }}
          />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter}
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, color: '#f9fafb', boxShadow: '0 4px 10px rgba(0,0,0,.25)', padding: '8px 10px' }}
            itemStyle={{ color: '#f9fafb', fontSize: 12, lineHeight: 1.2 }}
            labelStyle={{ color: '#93c5fd', fontSize: 11, fontWeight: 500, marginBottom: 4 }}
            cursor={{ stroke: '#6b7280', strokeWidth: 1, strokeDasharray: '3 3' }}
            wrapperStyle={{ outline: 'none' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {normalizedSeries.map((s) => (
            <Line
              key={s.name}
              name={s.name}
              data={s.data}
              dataKey="value"
              type="monotone"
              stroke={s.color}
              strokeWidth={s.strokeWidth}
              strokeDasharray={s.strokeDasharray}
              dot={{ r: 4, stroke: s.color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
              connectNulls={s.connectNulls}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Example (remove when integrating):
// <FinancialChart
//   beginYear={2025}
//   endYear={2035}
//   valueLabel="Net Worth"
//   series={[
//     { name: 'Projection A', values: { 2025: 12000, 2026: 18000, 2027: 15000, 2029: 22000 } },
//     { name: 'Projection B', values: [ { year: 2025, value: 10000 }, { year: 2026, value: 12500 }, { year: 2027, value: 17000 }, { year: 2028, value: 21000 } ], strokeDasharray: '5 4' }
//   ]}
// />
