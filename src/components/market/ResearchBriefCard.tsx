import { BookOpen, ShieldAlert, Sparkles } from 'lucide-react';
import { getTraitLabel } from '@/engine/companyTraits';
import type { ResearchBrief } from '@/engine/types';

function fitClass(tone: ResearchBrief['macroFit']['tone']) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)] text-[var(--profit-green)]';
  if (tone === 'negative') return 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)] text-[var(--loss-red)]';
  return 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--info-blue)]';
}

export default function ResearchBriefCard({ brief }: { brief: ResearchBrief | null }) {
  if (!brief) return null;

  return (
    <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-[var(--neutral-amber)]" />
        <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Research Brief</h3>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {brief.traits.map((trait) => (
          <span key={trait} className="text-[10px] px-2 py-1 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-secondary)]">
            {getTraitLabel(trait)}
          </span>
        ))}
      </div>

      <p className="text-sm text-[var(--text-primary)] font-medium">{brief.thesis}</p>

      <div className={`rounded-xl border p-3 mt-3 ${fitClass(brief.macroFit.tone)}`}>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {brief.macroFit.label}
          </span>
          <span className="text-[10px] font-mono-data">{(brief.macroFit.score * 100).toFixed(1)}%</span>
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-1">{brief.macroFit.description}</p>
      </div>

      <div className="mt-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ShieldAlert className="w-3.5 h-3.5 text-[var(--neutral-amber)]" />
          <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Risks</span>
        </div>
        <div className="space-y-1.5">
          {brief.risks.slice(0, 3).map((risk) => (
            <p key={risk} className="text-xs text-[var(--text-secondary)]">{risk}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
