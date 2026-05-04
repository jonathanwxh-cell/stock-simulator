import { Lightbulb, Sparkles } from 'lucide-react';
import type { StockCoach, StockCoachCallout } from '@/engine/marketCoach';

function toneClass(tone: StockCoach['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.07)]';
  if (tone === 'warning') return 'border-[rgba(245,158,11,0.3)] bg-[rgba(245,158,11,0.08)]';
  if (tone === 'danger') return 'border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.1)]';
  return 'border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.06)]';
}

function calloutClass(tone: StockCoachCallout['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.22)] text-[var(--profit-green)]';
  if (tone === 'warning') return 'border-[rgba(245,158,11,0.26)] text-[var(--neutral-amber)]';
  if (tone === 'danger') return 'border-[rgba(239,68,68,0.3)] text-[var(--loss-red)]';
  return 'border-[var(--border)] text-[var(--info-blue)]';
}

export default function StockCoachCard({ coach }: { coach: StockCoach }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneClass(coach.tone)}`}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-0)]/70 text-[var(--info-blue)]">
          <Lightbulb className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[var(--neutral-amber)]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Coach Playbook</p>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{coach.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{coach.body}</p>

          {coach.callouts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {coach.callouts.slice(0, 3).map((callout) => (
                <span
                  key={`${callout.label}-${callout.value}`}
                  className={`rounded-full border bg-[var(--surface-0)]/60 px-2.5 py-1 text-[10px] font-medium ${calloutClass(callout.tone)}`}
                >
                  <span className="text-[var(--text-muted)]">{callout.label}: </span>{callout.value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
