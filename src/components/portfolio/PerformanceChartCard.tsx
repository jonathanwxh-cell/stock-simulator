import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { buildPerformanceSeries, type PerformanceRange } from '../../engine/performanceSeries';
import type { GameState } from '../../engine/types';

const RANGE_OPTIONS: PerformanceRange[] = ['12m', '24m', 'all'];

function pctFromNormalized(value: number) {
  const delta = value - 100;
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`;
}

function tooltipLabel(value: unknown, payload?: Array<{ payload?: { date?: Date } }>) {
  const date = payload?.[0]?.payload?.date;
  const dateLabel =
    date instanceof Date
      ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : `Turn ${value}`;
  return `Turn ${value} - ${dateLabel}`;
}

export default function PerformanceChartCard({ gameState }: { gameState: GameState }) {
  const [range, setRange] = useState<PerformanceRange>('24m');
  const series = buildPerformanceSeries(gameState, range);

  if (series.length === 0) {
    return (
      <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-[var(--info-blue)]" />
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Performance Chart</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">Advance a few turns to unlock the portfolio vs benchmark chart.</p>
      </div>
    );
  }

  const latestPoint = series[series.length - 1];
  const minValue = Math.min(...series.flatMap((point) => [point.playerNormalized, point.marketNormalized]), 95);
  const maxValue = Math.max(...series.flatMap((point) => [point.playerNormalized, point.marketNormalized]), 105);
  const domainPad = Math.max((maxValue - minValue) * 0.12, 2);

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--info-blue)]" />
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Performance Chart</h2>
            <p className="text-[10px] text-[var(--text-muted)]">Normalized to 100 at the start of the visible range.</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-[var(--surface-1)] p-1">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase transition-all ${
                range === option
                  ? 'bg-[var(--surface-2)] text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={196}>
        <LineChart data={series}>
          <XAxis
            dataKey="turn"
            tick={{ fill: '#9AA4B2', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(turn: number) => `T${turn}`}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: '#9AA4B2', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            domain={[minValue - domainPad, maxValue + domainPad]}
            tickFormatter={(value: number) => `${value.toFixed(0)}`}
            width={40}
          />
          <Tooltip
            labelFormatter={tooltipLabel}
            formatter={(value: number, name: string) => [
              pctFromNormalized(value),
              name === 'playerNormalized' ? 'Portfolio' : 'Benchmark',
            ]}
            contentStyle={{
              background: '#1E2230',
              border: '1px solid #2A3045',
              borderRadius: 10,
              fontSize: 12,
            }}
          />
          <ReferenceLine y={100} stroke="#485266" strokeDasharray="4 4" />
          <Line
            type="monotone"
            dataKey="playerNormalized"
            name="Portfolio"
            stroke="#22C55E"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="marketNormalized"
            name="Benchmark"
            stroke="#60A5FA"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.16)] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block">Portfolio</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{pctFromNormalized(latestPoint.playerNormalized)}</span>
        </div>
        <div className="rounded-xl bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.16)] p-3">
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] block">Benchmark</span>
          <span className="text-sm font-mono-data font-semibold text-[var(--text-primary)]">{pctFromNormalized(latestPoint.marketNormalized)}</span>
        </div>
      </div>
    </div>
  );
}
