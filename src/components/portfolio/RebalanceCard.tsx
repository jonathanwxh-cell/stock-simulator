import { useState } from 'react';
import { RefreshCw, Target, Trash2 } from 'lucide-react';
import { SECTOR_LABELS } from '../../engine/config';
import { buildRebalancePreview } from '../../engine/rebalancing';
import { getNetWorth } from '../../engine/marketSimulator';
import { ALL_SECTORS } from '../../engine/types';
import type { AllocationTarget, GameState, RebalanceMode, RebalancePreview } from '../../engine/types';

type DraftRow = { id: string; weight: string };

function roundWeight(value: number) {
  return Math.round(value * 10) / 10;
}

function formatWeight(value: number) {
  return roundWeight(value).toFixed(1);
}

function parseWeight(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stockLabel(gameState: GameState, stockId: string) {
  const stock = gameState.stocks.find((entry) => entry.id === stockId);
  return stock ? `${stock.ticker} - ${stock.name}` : stockId;
}

function optionLabel(gameState: GameState, mode: RebalanceMode, id: string) {
  return mode === 'stock' ? stockLabel(gameState, id) : (SECTOR_LABELS[id] || id);
}

function availableOptions(gameState: GameState, mode: RebalanceMode) {
  if (mode === 'stock') {
    return [...gameState.stocks]
      .sort((left, right) => left.ticker.localeCompare(right.ticker))
      .map((stock) => ({ id: stock.id, label: stockLabel(gameState, stock.id) }));
  }

  return ALL_SECTORS
    .map((sector) => ({ id: sector, label: SECTOR_LABELS[sector] || sector }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function currentWeights(gameState: GameState, mode: RebalanceMode) {
  const netWorth = getNetWorth(gameState);
  const weights = new Map<string, number>();
  if (netWorth <= 0) return weights;

  for (const [stockId, position] of Object.entries(gameState.portfolio)) {
    if (position.shares <= 0) continue;
    const stock = gameState.stocks.find((entry) => entry.id === stockId);
    if (!stock) continue;
    const weight = ((stock.currentPrice * position.shares) / netWorth) * 100;
    const key = mode === 'stock' ? stock.id : stock.sector;
    weights.set(key, (weights.get(key) || 0) + weight);
  }

  for (const [stockId, position] of Object.entries(gameState.shortPositions)) {
    if (position.shares <= 0) continue;
    const stock = gameState.stocks.find((entry) => entry.id === stockId);
    if (!stock) continue;
    const weight = -((stock.currentPrice * position.shares) / netWorth) * 100;
    const key = mode === 'stock' ? stock.id : stock.sector;
    weights.set(key, (weights.get(key) || 0) + weight);
  }

  return weights;
}

function buildCurrentRows(gameState: GameState, mode: RebalanceMode): DraftRow[] {
  return [...currentWeights(gameState, mode).entries()]
    .filter(([, weight]) => Math.abs(weight) >= 0.1)
    .sort((left, right) => optionLabel(gameState, mode, left[0]).localeCompare(optionLabel(gameState, mode, right[0])))
    .map(([id, weight]) => ({ id, weight: formatWeight(weight) }));
}

function nextAvailableId(gameState: GameState, mode: RebalanceMode, rows: DraftRow[]) {
  const usedIds = new Set(rows.map((row) => row.id));
  return availableOptions(gameState, mode).find((option) => !usedIds.has(option.id))?.id || '';
}

function buildTargets(rows: DraftRow[]): { targets: AllocationTarget[]; cashWeight: number; editableSum: number } {
  const normalizedRows = rows
    .filter((row) => row.id)
    .map((row) => ({ id: row.id, weight: roundWeight(parseWeight(row.weight)) }))
    .filter((row) => Math.abs(row.weight) > 0.01);
  const editableSum = roundWeight(normalizedRows.reduce((sum, row) => sum + row.weight, 0));
  const cashWeight = roundWeight(100 - editableSum);
  return {
    targets: [...normalizedRows, { id: 'cash', weight: cashWeight }],
    cashWeight,
    editableSum,
  };
}

function tradeTone(type: string) {
  if (type === 'buy' || type === 'cover') return 'text-[var(--profit-green)]';
  return 'text-[var(--loss-red)]';
}

export default function RebalanceCard({
  gameState,
  onExecute,
}: {
  gameState: GameState;
  onExecute: (preview: RebalancePreview) => void;
}) {
  const [mode, setMode] = useState<RebalanceMode>('stock');
  const [rows, setRows] = useState<DraftRow[]>(() => buildCurrentRows(gameState, 'stock'));
  const [draftId, setDraftId] = useState(() => nextAvailableId(gameState, 'stock', buildCurrentRows(gameState, 'stock')));

  const options = availableOptions(gameState, mode);
  const current = currentWeights(gameState, mode);
  const { targets, cashWeight } = buildTargets(rows);
  const preview = buildRebalancePreview(gameState, mode, targets);
  const invalidTargetIds = new Set(rows.map((row) => row.id));
  const draftOptions = options.filter((option) => !invalidTargetIds.has(option.id));

  const switchMode = (nextMode: RebalanceMode) => {
    const nextRows = buildCurrentRows(gameState, nextMode);
    setMode(nextMode);
    setRows(nextRows);
    setDraftId(nextAvailableId(gameState, nextMode, nextRows));
  };

  const updateRow = (index: number, field: keyof DraftRow, value: string) => {
    setRows((currentRows) => currentRows.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row));
  };

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index);
    setRows(nextRows);
    setDraftId(nextAvailableId(gameState, mode, nextRows));
  };

  const addRow = () => {
    if (!draftId) return;
    const nextRows = [...rows, { id: draftId, weight: '0.0' }];
    setRows(nextRows);
    setDraftId(nextAvailableId(gameState, mode, nextRows));
  };

  const resetToCurrent = () => {
    const nextRows = buildCurrentRows(gameState, mode);
    setRows(nextRows);
    setDraftId(nextAvailableId(gameState, mode, nextRows));
  };

  const clearTargets = () => {
    setRows([]);
    setDraftId(nextAvailableId(gameState, mode, []));
  };

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-[var(--profit-green)]" />
          <div>
            <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Portfolio Rebalancer</h2>
            <p className="text-[10px] text-[var(--text-muted)]">Set signed stock or sector targets. Cash is auto-balanced to the remaining weight.</p>
          </div>
        </div>
        <div className="flex gap-1 rounded-lg bg-[var(--surface-1)] p-1">
          <button
            type="button"
            onClick={() => switchMode('stock')}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase ${mode === 'stock' ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
          >
            Stock
          </button>
          <button
            type="button"
            onClick={() => switchMode('sector')}
            className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase ${mode === 'sector' ? 'bg-[var(--surface-2)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
          >
            Sector
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={resetToCurrent}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Use Current
        </button>
        <button
          type="button"
          onClick={clearTargets}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      <div className="space-y-2 mb-3">
        {rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Start with your current exposures or add custom targets below.</p>
          </div>
        ) : (
          rows.map((row, index) => {
            const rowOptions = options.filter((option) => option.id === row.id || !rows.some((entry, entryIndex) => entryIndex !== index && entry.id === option.id));
            const currentWeight = current.get(row.id) || 0;
            return (
              <div key={`${row.id}-${index}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                  <label className="text-xs text-[var(--text-muted)]">
                    Target
                    <select
                      value={row.id}
                      onChange={(event) => updateRow(index, 'id', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
                    >
                      {rowOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-[var(--text-muted)] min-w-[108px]">
                    Weight %
                    <input
                      type="number"
                      step="0.5"
                      value={row.weight}
                      onChange={(event) => updateRow(index, 'weight', event.target.value)}
                      className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="h-[42px] w-10 rounded-lg border border-[var(--border)] bg-[var(--surface-0)] text-[var(--text-muted)] flex items-center justify-center hover:text-[var(--loss-red)] hover:border-[rgba(239,68,68,0.35)]"
                    aria-label={`Remove ${row.id} target`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] mt-2">
                  Current exposure {currentWeight >= 0 ? '+' : ''}{formatWeight(currentWeight)}%
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3 mb-3">
        <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
          <label className="text-xs text-[var(--text-muted)]">
            Add Target
            <select
              value={draftId}
              onChange={(event) => setDraftId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-0)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--info-blue)]"
            >
              <option value="">No targets left</option>
              {draftOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={addRow}
            disabled={!draftId}
            className="h-[42px] rounded-lg bg-[var(--surface-0)] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--border-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[var(--text-muted)] block uppercase tracking-wider">Basis</span>
          <span className="font-mono-data text-[var(--text-primary)]">${preview.totalBasis.toFixed(2)}</span>
        </div>
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[var(--text-muted)] block uppercase tracking-wider">Target Cash</span>
          <span className={`font-mono-data ${cashWeight >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--loss-red)]'}`}>{cashWeight >= 0 ? '+' : ''}{formatWeight(cashWeight)}%</span>
        </div>
        <div className="rounded-xl bg-[var(--surface-1)] p-3">
          <span className="text-[var(--text-muted)] block uppercase tracking-wider">Cash After</span>
          <span className="font-mono-data text-[var(--text-primary)]">${preview.cashAfter.toFixed(2)}</span>
        </div>
      </div>

      {preview.warnings.length > 0 && (
        <div className="rounded-xl border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] p-3 mb-3">
          <p className="text-xs font-semibold text-[var(--neutral-amber)] uppercase tracking-wider mb-2">Preview Warnings</p>
          <div className="space-y-1">
            {preview.warnings.map((warning) => (
              <p key={warning} className="text-xs text-[var(--text-secondary)]">{warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trade Preview</h3>
            <p className="text-[10px] text-[var(--text-muted)]">{preview.trades.length} planned trade{preview.trades.length === 1 ? '' : 's'}</p>
          </div>
          <button
            type="button"
            onClick={() => onExecute(preview)}
            disabled={preview.trades.length === 0}
            className="rounded-xl bg-[var(--profit-green)] px-4 py-2.5 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Rebalance Now
          </button>
        </div>

        {preview.trades.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">No trades yet. Add or change target weights to generate a rebalance plan.</p>
        ) : (
          <div className="space-y-2">
            {preview.trades.map((trade) => {
              const stock = gameState.stocks.find((entry) => entry.id === trade.stockId);
              return (
                <div key={`${trade.stockId}-${trade.type}-${trade.reason}`} className="rounded-lg border border-[var(--border)] bg-[var(--surface-0)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase ${tradeTone(trade.type)}`}>{trade.type}</span>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{stock?.ticker || trade.stockId}</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">{trade.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono-data text-[var(--text-primary)]">{trade.shares} shares</p>
                      <p className="text-[10px] text-[var(--text-muted)]">${trade.estimatedValue.toFixed(2)} + ${trade.fee.toFixed(2)} fee</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
