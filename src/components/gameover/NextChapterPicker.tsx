import { ArrowRight, Flame, Landmark, RefreshCcw, ShieldCheck, Sparkles } from 'lucide-react';
import type { LegacyPathOffer } from '@/engine/legacyStory';
import { CHALLENGE_MODES, SEASON_THEMES } from '@/engine/careerSeasons';

const toneStyles: Record<LegacyPathOffer['tone'], {
  border: string;
  background: string;
  accent: string;
  Icon: typeof Sparkles;
}> = {
  stable: {
    border: 'border-[rgba(59,130,246,0.22)]',
    background: 'bg-[linear-gradient(160deg,rgba(59,130,246,0.12),rgba(15,23,42,0.86))]',
    accent: 'text-[var(--info-blue)]',
    Icon: ShieldCheck,
  },
  volatile: {
    border: 'border-[rgba(245,158,11,0.28)]',
    background: 'bg-[linear-gradient(160deg,rgba(245,158,11,0.14),rgba(15,23,42,0.88))]',
    accent: 'text-[var(--neutral-amber)]',
    Icon: Flame,
  },
  redemption: {
    border: 'border-[rgba(34,197,94,0.22)]',
    background: 'bg-[linear-gradient(160deg,rgba(34,197,94,0.12),rgba(15,23,42,0.86))]',
    accent: 'text-[var(--profit-green)]',
    Icon: RefreshCcw,
  },
  prestige: {
    border: 'border-[rgba(234,179,8,0.28)]',
    background: 'bg-[linear-gradient(160deg,rgba(234,179,8,0.13),rgba(15,23,42,0.86))]',
    accent: 'text-[#FACC15]',
    Icon: Landmark,
  },
  weird: {
    border: 'border-[rgba(168,85,247,0.28)]',
    background: 'bg-[linear-gradient(160deg,rgba(168,85,247,0.14),rgba(15,23,42,0.88))]',
    accent: 'text-[#C084FC]',
    Icon: Sparkles,
  },
};

export default function NextChapterPicker({
  offers,
  onChoose,
}: {
  offers: LegacyPathOffer[];
  onChoose: (offer: LegacyPathOffer) => void;
}) {
  return (
    <section className="mb-6 text-left">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--info-blue)]">Market Saga</span>
          <h2 className="mt-1 text-xl font-display font-bold text-[var(--text-primary)]">Choose Next Chapter</h2>
        </div>
        <p className="hidden max-w-xs text-right text-xs text-[var(--text-muted)] sm:block">
          Each ending opens a different sequel season, so repeat runs do not all feel the same.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {offers.map((offer) => {
          const style = toneStyles[offer.tone];
          const Icon = style.Icon;
          const theme = SEASON_THEMES[offer.nextThemeId];
          const challenge = CHALLENGE_MODES[offer.challengeMode || 'standard'];

          return (
            <article key={offer.id} className={`${style.background} ${style.border} rounded-2xl border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.2)]`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className={`rounded-xl border border-white/10 bg-black/20 p-2 ${style.accent}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  {challenge.badge}
                </span>
              </div>
              <h3 className="text-sm font-display font-bold text-[var(--text-primary)]">{offer.title}</h3>
              <p className={`mt-1 text-xs font-semibold ${style.accent}`}>{offer.subtitle}</p>
              <p className="mt-3 min-h-16 text-xs leading-relaxed text-[var(--text-secondary)]">{offer.description}</p>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/16 p-3">
                <span className="block text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Next Season</span>
                <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{theme.title}</p>
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">{offer.rewardPreview}</p>
              </div>
              <button
                type="button"
                onClick={() => onChoose(offer)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--profit-green)] px-3 py-2.5 text-sm font-semibold text-black transition-all hover:brightness-110"
              >
                Choose Chapter <ArrowRight className="h-4 w-4" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
