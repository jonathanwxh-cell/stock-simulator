import { ArrowRight, Compass, Sparkles } from 'lucide-react';
import type { CoachAction, CoachCard, GuidedMarketCoach } from '@/engine/marketCoach';

function toneClass(tone: CoachCard['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.08)]';
  if (tone === 'warning') return 'border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)]';
  if (tone === 'danger') return 'border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.1)]';
  return 'border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.06)]';
}

function textClass(tone: CoachCard['tone']) {
  if (tone === 'positive') return 'text-[var(--profit-green)]';
  if (tone === 'warning') return 'text-[var(--neutral-amber)]';
  if (tone === 'danger') return 'text-[var(--loss-red)]';
  return 'text-[var(--info-blue)]';
}

function CoachActionButton({
  action,
  tone,
  onAction,
}: {
  action?: CoachAction;
  tone: CoachCard['tone'];
  onAction: (action: CoachAction) => void;
}) {
  if (!action) return null;

  return (
    <button
      type="button"
      onClick={() => onAction(action)}
      className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110 ${textClass(tone)} border-current/30 bg-[var(--surface-0)]/60`}
    >
      {action.label}
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );
}

export default function MarketCoachCard({
  coach,
  onAction,
}: {
  coach: GuidedMarketCoach;
  onAction: (action: CoachAction) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(59,130,246,0.24)] bg-[linear-gradient(135deg,rgba(59,130,246,0.12),rgba(34,197,94,0.05),rgba(15,23,42,0.08))] p-4">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[rgba(59,130,246,0.12)] blur-2xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.14)] text-[var(--info-blue)]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Market Coach</h3>
            <p className="text-[10px] text-[var(--text-muted)]">One useful read, no homework.</p>
          </div>
        </div>

        <div className={`rounded-2xl border p-3 ${toneClass(coach.hero.tone)}`}>
          <div className="flex items-start gap-2">
            <Sparkles className={`mt-0.5 h-4 w-4 shrink-0 ${textClass(coach.hero.tone)}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{coach.hero.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{coach.hero.body}</p>
              <CoachActionButton action={coach.hero.action} tone={coach.hero.tone} onAction={onAction} />
            </div>
          </div>
        </div>

        {coach.recap && (
          <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--surface-0)]/60 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Last Turn Recap</p>
            <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{coach.recap.title}</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{coach.recap.body}</p>
            <CoachActionButton action={coach.recap.action} tone={coach.recap.tone} onAction={onAction} />
          </div>
        )}

        {coach.tips.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {coach.tips.slice(0, 2).map((tip) => (
              <button
                key={tip.id}
                type="button"
                onClick={() => tip.action && onAction(tip.action)}
                className={`rounded-xl border p-3 text-left transition-all hover:border-[var(--border-hover)] ${toneClass(tip.tone)}`}
              >
                <p className={`text-[10px] font-semibold uppercase tracking-wider ${textClass(tip.tone)}`}>Coach Tip</p>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{tip.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{tip.body}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
