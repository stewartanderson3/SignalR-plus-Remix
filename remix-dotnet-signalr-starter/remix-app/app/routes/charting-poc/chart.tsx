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
    const colorPalette = ['var(--color-primary)', '#dc2626', '#059669', '#7c3aed', '#d97706', '#0d9488'];
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

  // Compute Y max across all numeric values (force baseline at 0 per design requirement)
  // Rationale: Product decision states all charts should have 0 at the bottom of the Y axis.
  // We therefore ignore negative minima (if any appear they would be clipped). If future
  // need arises to display negatives, introduce a prop (e.g. allowNegative) and adjust.
  const yDomain = useMemo<[number, number]>(() => {
    const vals: number[] = [];
    normalizedSeries.forEach((s) => s.data.forEach((p: YearValuePoint) => { if (typeof p.value === 'number' && isFinite(p.value)) vals.push(p.value); }));
    if (!vals.length) return [0, 1];
    const max = Math.max(...vals, 0);
    if (max === 0) return [0, 1]; // flat line safeguard
    const pad = max * 0.05; // 5% visual headroom
    return [0, Math.ceil(max + pad)];
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
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
          <XAxis
            dataKey="year"
            type="number"
            domain={[minYear, maxYear]}
            ticks={years}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <YAxis
            type="number"
            domain={yDomain}
            tick={{ fontSize: 12 }}
            tickFormatter={(n: number) => formatter.format(n)}
            width={80}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
          />
          <Tooltip
            formatter={tooltipFormatter}
            labelFormatter={tooltipLabelFormatter}
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, color: 'var(--color-text)', boxShadow: '0 4px 12px rgba(0,0,0,.08)', padding: '8px 10px' }}
            itemStyle={{ color: 'var(--color-text)', fontSize: 12, lineHeight: 1.2 }}
            labelStyle={{ color: 'var(--color-primary)', fontSize: 11, fontWeight: 500, marginBottom: 4 }}
            cursor={{ stroke: 'var(--color-border)', strokeWidth: 1, strokeDasharray: '3 3' }}
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
