import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Trophy, Vault } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { RARITY_COLORS } from '../components/trophies/TrophyArt';
import TrophyArt from '../components/trophies/TrophyArt';
import { summarizeTrophyCollections, TROPHY_DEFINITIONS } from '../engine/trophySystem';

export default function TrophyRoom() {
  const { trophyCase, goBack, navigateTo } = useGame();
  const summaries = summarizeTrophyCollections(trophyCase);
  const unlockedCount = Object.keys(trophyCase.unlocked).length;
  const totalCount = TROPHY_DEFINITIONS.length;
  const completionPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_30%_0%,rgba(34,197,94,0.12),transparent_32%),radial-gradient(circle_at_85%_8%,rgba(168,85,247,0.16),transparent_30%)] p-4 pb-28">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-5xl">
        <div className="mb-5 flex items-center gap-3">
          <button onClick={goBack} aria-label="Go back" className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-0)] hover:bg-[var(--surface-1)]">
            <ArrowLeft className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Vault className="h-5 w-5 text-[var(--neutral-amber)]" />
              <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">Fund Trophy Room</h1>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Collect proof of trading styles, market mastery, and calm hands across every run.</p>
          </div>
          <button onClick={() => navigateTo('title')} className="hidden rounded-xl border border-[var(--border)] bg-[var(--surface-0)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-1)] sm:block">
            Main Menu
          </button>
        </div>

        <div className="mb-5 grid gap-3 md:grid-cols-[1.35fr_0.65fr]">
          <div className="relative overflow-hidden rounded-3xl border border-[rgba(34,197,94,0.25)] bg-[rgba(6,10,18,0.78)] p-5">
            <div className="absolute right-4 top-4 opacity-20">
              <Trophy className="h-24 w-24 text-[var(--profit-green)]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--profit-green)]">Legacy Vault</p>
            <h2 className="mt-2 max-w-xl font-display text-3xl font-bold text-[var(--text-primary)]">Every run leaves a mark.</h2>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Trophies unlock automatically while you trade. No journaling, no forms, no chores: just collectible proof that your fund has been places.</p>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[var(--surface-2)]">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--profit-green)] via-[var(--neutral-amber)] to-[var(--info-blue)]" style={{ width: `${completionPct}%` }} />
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">{unlockedCount} of {totalCount} trophies unlocked - {completionPct}% complete</p>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-0)] p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--neutral-amber)]" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Rarity Mix</h2>
            </div>
            <div className="mt-4 space-y-2">
              {(['bronze', 'silver', 'gold', 'prismatic'] as const).map((rarity) => {
                const total = TROPHY_DEFINITIONS.filter((trophy) => trophy.rarity === rarity).length;
                const unlocked = TROPHY_DEFINITIONS.filter((trophy) => trophy.rarity === rarity && trophyCase.unlocked[trophy.id]).length;
                return (
                  <div key={rarity} className="flex items-center justify-between rounded-xl bg-[var(--surface-1)] px-3 py-2">
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: RARITY_COLORS[rarity].primary }}>{rarity}</span>
                    <span className="font-mono-data text-xs text-[var(--text-secondary)]">{unlocked}/{total}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {summaries.map((collection) => (
            <section key={collection.id} className="rounded-3xl border border-[var(--border)] bg-[rgba(9,13,22,0.82)] p-4">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[var(--text-primary)]">{collection.title}</h2>
                  <p className="text-xs text-[var(--text-secondary)]">{collection.description}</p>
                </div>
                <span className="w-fit rounded-full border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-mono-data text-[var(--text-secondary)]">
                  {collection.unlocked}/{collection.total} - {collection.completionPct}%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {collection.trophies.map(({ definition, unlock }) => {
                  const unlocked = Boolean(unlock);
                  const rarity = RARITY_COLORS[definition.rarity];
                  return (
                    <motion.article
                      key={definition.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl border bg-[var(--surface-0)] p-3 ${unlocked ? '' : 'opacity-80'}`}
                      style={{ borderColor: unlocked ? `${rarity.primary}55` : 'var(--border)' }}
                    >
                      <TrophyArt definition={definition} unlocked={unlocked} />
                      <div className="mt-3">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{definition.title}</h3>
                          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wider" style={{ color: rarity.primary }}>{definition.rarity}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] text-[var(--text-secondary)]">{definition.description}</p>
                        <p className="mt-2 text-[10px] text-[var(--text-muted)]">
                          {unlock ? `Unlocked turn ${unlock.unlockedTurn}` : 'Hidden until earned'}
                        </p>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
