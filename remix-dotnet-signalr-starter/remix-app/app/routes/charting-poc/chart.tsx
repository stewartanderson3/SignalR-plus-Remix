import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import React, { useMemo } from 'react';

type YearValuePoint = { year: number; value: number | null };

type SeriesInput = {
  name: string;
  values: Record<number, number | null | undefined> | YearValuePoint[];
  color?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  connectNulls?: boolean;
};

export interface FinancialChartProps {
  beginYear: number;
  endYear: number;
  series: SeriesInput[];
  currency?: string;
  valueLabel?: string;
  height?: number;
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
  maxWidth,
}: FinancialChartProps) {
  // Normalize and guard year range
  const [minYear, maxYear] = beginYear <= endYear ? [beginYear, endYear] : [endYear, beginYear];
  const years = useMemo(() => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i), [minYear, maxYear]);

  const normalizedSeries = useMemo(() => {
    // Assign consistent colors
    const colorPalette = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0d9488'];
    // Build per-series normalized arrays first
    return series.map((s, idx) => {
      const defaultColor = colorPalette[idx % colorPalette.length];
      const points = toArrayPoints(s.values);
      const pointMap = new Map(points.map((p) => [p.year, p.value]));
      const filled = years.map<YearValuePoint>((y) => ({ year: y, value: pointMap.has(y) ? pointMap.get(y)! : null }));
      // Stable object key for unified dataset (avoid spaces & punctuation)
      let keyBase = s.name.replace(/[^A-Za-z0-9_]+/g, '_');
      if (!/^[A-Za-z_]/.test(keyBase)) keyBase = '_' + keyBase; // ensure valid identifier-like start
      const key = `${keyBase}_${idx}`; // idx suffix prevents accidental collisions
      return {
        ...s,
        key,
        color: s.color || defaultColor,
        strokeWidth: s.strokeWidth ?? 2,
        strokeDasharray: s.strokeDasharray,
        connectNulls: s.connectNulls ?? false,
        data: filled,
      };
    });
  }, [series, years]);

  // Unified dataset so each year row contains all series values => fixes tooltip misalignment when each Line had its own data array.
  const unifiedData = useMemo(() => {
    return years.map((y) => {
      const row: Record<string, any> = { year: y };
      normalizedSeries.forEach((s) => {
        const point = s.data[y - years[0]]; // aligned index because we filled sequential years
        row[s.key] = point ? point.value : null;
      });
      return row;
    });
  }, [years, normalizedSeries]);

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
    const lower = min < 0 ? min - pad : Math.max(0, min - pad);
    return [Math.floor(lower), Math.ceil(max + pad)];
  }, [normalizedSeries]);

  const formatter = useMemo(() => defaultCurrencyFormatter(currency), [currency]);

  // Data fed to LineChart now contains year and all series keys
  const axisData = unifiedData;

  const tooltipFormatter = (value: any) => (typeof value === 'number' ? formatter.format(value) : value);
  const tooltipLabelFormatter = (label: any) => `Year ${label}${valueLabel ? ` • ${valueLabel}` : ''}`;

  // Allow full-width expansion by default. Only constrain width if a maxWidth prop is explicitly provided.
  const outerStyle: React.CSSProperties = { width: '100%', height, borderRadius: 8, padding: 8 };
  if (maxWidth !== undefined) outerStyle.maxWidth = maxWidth;

  return (
    <div style={outerStyle}>
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
              key={s.key}
              name={s.name}
              dataKey={s.key}
              type="monotone"
              stroke={s.color}
              strokeWidth={s.strokeWidth}
              strokeDasharray={s.strokeDasharray}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={s.connectNulls}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
