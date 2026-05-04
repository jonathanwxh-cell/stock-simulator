import { ArrowRight, ClipboardList, ShieldAlert, Sparkles, Target } from 'lucide-react';
import type { OpportunityAction, OpportunityCard, OpportunityTone } from '@/engine/opportunityBoard';

function toneClass(tone: OpportunityTone): string {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.26)] bg-[rgba(34,197,94,0.07)]';
  if (tone === 'warning') return 'border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)]';
  if (tone === 'danger') return 'border-[rgba(239,68,68,0.34)] bg-[rgba(239,68,68,0.1)]';
  return 'border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.06)]';
}

function textClass(tone: OpportunityTone): string {
  if (tone === 'positive') return 'text-[var(--profit-green)]';
  if (tone === 'warning') return 'text-[var(--neutral-amber)]';
  if (tone === 'danger') return 'text-[var(--loss-red)]';
  return 'text-[var(--info-blue)]';
}

function iconFor(tone: OpportunityTone) {
  if (tone === 'danger' || tone === 'warning') return ShieldAlert;
  if (tone === 'positive') return Sparkles;
  return Target;
}

function progressColor(tone: OpportunityTone): string {
  if (tone === 'positive') return 'var(--profit-green)';
  if (tone === 'warning') return 'var(--neutral-amber)';
  if (tone === 'danger') return 'var(--loss-red)';
  return 'var(--info-blue)';
}

export default function OpportunityBoardCard({
  opportunities,
  onAction,
}: {
  opportunities: OpportunityCard[];
  onAction: (action: OpportunityAction) => void;
}) {
  if (opportunities.length === 0) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[rgba(34,197,94,0.2)] bg-[linear-gradient(140deg,rgba(34,197,94,0.1),rgba(245,158,11,0.06),rgba(15,23,42,0.05))] p-4">
      <div className="absolute -left-12 -top-12 h-28 w-28 rounded-full bg-[rgba(34,197,94,0.12)] blur-2xl" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[rgba(34,197,94,0.13)] text-[var(--profit-green)]">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Next Best Plays</h3>
            <p className="text-[10px] text-[var(--text-muted)]">Fresh goals generated from this run.</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {opportunities.map((opportunity) => {
            const Icon = iconFor(opportunity.tone);
            return (
              <article key={opportunity.id} className={`rounded-2xl border p-3 ${toneClass(opportunity.tone)}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${textClass(opportunity.tone)}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${textClass(opportunity.tone)}`}>{opportunity.eyebrow}</span>
                </div>
                <h4 className="mt-2 text-sm font-semibold text-[var(--text-primary)]">{opportunity.title}</h4>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">{opportunity.body}</p>
                {opportunity.progress && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                      <span>{opportunity.progress.label}</span>
                      <span>{opportunity.progress.value}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
                      <div className="h-full rounded-full" style={{ width: `${opportunity.progress.value}%`, backgroundColor: progressColor(opportunity.tone) }} />
                    </div>
                  </div>
                )}
                {opportunity.action && (
                  <button
                    type="button"
                    onClick={() => onAction(opportunity.action!)}
                    className={`mt-3 inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-[var(--surface-0)]/60 px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110 ${textClass(opportunity.tone)}`}
                  >
                    {opportunity.action.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
