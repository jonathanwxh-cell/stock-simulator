import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, DollarSign, BarChart3, Award, ArrowRight, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { getLatestTurnPerformance } from '../engine/turnPerformance';
import { getCareerSeasonTurn } from '../engine/careerSeasons';
import { buildPostTurnDigest, type PostTurnDigestTone } from '../engine/postTurnDigest';
import MarginCallToast from '../components/gameover/MarginCallToast';

function pct(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function severityClass(severity: string) {
  if (severity === 'positive') return 'bg-[rgba(34,197,94,0.15)] text-[var(--profit-green)] border-[rgba(34,197,94,0.25)]';
  if (severity === 'warning') return 'bg-[rgba(245,158,11,0.15)] text-[var(--neutral-amber)] border-[rgba(245,158,11,0.25)]';
  if (severity === 'danger') return 'bg-[rgba(239,68,68,0.15)] text-[var(--loss-red)] border-[rgba(239,68,68,0.25)]';
  return 'bg-[var(--surface-1)] text-[var(--info-blue)] border-[var(--border)]';
}

function digestToneClass(tone: PostTurnDigestTone) {
  if (tone === 'positive') return 'border-[rgba(34,197,94,0.28)] bg-[rgba(34,197,94,0.08)] text-[var(--profit-green)]';
  if (tone === 'warning') return 'border-[rgba(245,158,11,0.28)] bg-[rgba(245,158,11,0.08)] text-[var(--neutral-amber)]';
  if (tone === 'danger') return 'border-[rgba(239,68,68,0.32)] bg-[rgba(239,68,68,0.1)] text-[var(--loss-red)]';
  return 'border-[rgba(59,130,246,0.24)] bg-[rgba(59,130,246,0.06)] text-[var(--info-blue)]';
}

export default function NextTurn() {
  const { gameState, navigateTo } = useGame();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!gameState) return;
      navigateTo(buildPostTurnDigest(gameState).nextAction.screen);
    }, 4200);
    return () => clearTimeout(timer);
  }, [gameState, navigateTo]);

  if (!gameState) return null;

  const currentSnapshot = gameState.netWorthHistory[gameState.netWorthHistory.length - 1];
  const previousSnapshot = gameState.netWorthHistory[gameState.netWorthHistory.length - 2];
  const netWorthChange = currentSnapshot && previousSnapshot
    ? currentSnapshot.netWorth - previousSnapshot.netWorth
    : 0;
  const { marketMovePct, playerMovePct, turnAlphaPct } = getLatestTurnPerformance(gameState);
  const advisorFeedback = gameState.lastAdvisorFeedback || [];
  const recentNews = gameState.newsHistory.filter(n => n.turn === gameState.currentTurn);
  const recentMarginCalls = gameState.transactionHistory.filter(t => t.type === 'margin_call' && t.turn === gameState.currentTurn);
  const latestBoardReview = gameState.career.boardReviews.find(review => review.turn === gameState.currentTurn);
  const seasonTurn = getCareerSeasonTurn(gameState);
  const digest = buildPostTurnDigest(gameState);

  return (
    <div className="min-h-[calc(100dvh-56px-72px)] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-8">
          <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-3" />
          <h2 className="text-display-md font-display font-bold text-[var(--text-primary)]">
            Season {gameState.career.seasonNumber} - Month {seasonTurn}
          </h2>
          <p className="text-[var(--text-secondary)] mt-1">
            {gameState.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        <MarginCallToast transactions={recentMarginCalls} />

        {/* Net Worth Summary */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--text-secondary)]">Net Worth</span>
            <div className={`flex items-center gap-1 ${netWorthChange >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>
              {netWorthChange >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="text-sm font-mono-data">
                {netWorthChange >= 0 ? '+' : ''}${netWorthChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="text-mono-lg font-mono-data font-bold text-[var(--text-primary)]">
            ${(currentSnapshot?.netWorth ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--text-muted)]">
            <DollarSign className="w-3 h-3" />
            <span>Cash: ${gameState.cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Market Move */}
        <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[var(--info-blue)]" />
            <h3 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Turn Snapshot</h3>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Market</span>
              <span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(marketMovePct)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">You</span>
              <span className="text-sm font-mono-data text-[var(--text-primary)]">{pct(playerMovePct)}</span>
            </div>
            <div>
              <span className="text-[10px] text-[var(--text-muted)] block">Alpha</span>
              <span className={`text-sm font-mono-data font-semibold ${turnAlphaPct >= 0 ? 'text-[var(--profit-green)]' : 'text-[var(--loss-red)]'}`}>{pct(turnAlphaPct)}</span>
            </div>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 mb-4 ${digestToneClass(digest.tone)}`}>
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-display font-bold text-[var(--text-primary)]">{digest.headline}</p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">{digest.body}</p>
              {digest.notes.length > 0 && (
                <div className="mt-3 space-y-1">
                  {digest.notes.map((note) => (
                    <p key={note} className="text-xs text-[var(--text-secondary)]">- {note}</p>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => navigateTo(digest.nextAction.screen)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-[var(--surface-0)]/60 px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110"
              >
                {digest.nextAction.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Board Review */}
        {latestBoardReview && (
          <div className="bg-[var(--surface-0)] border border-[rgba(245,158,11,0.3)] rounded-2xl p-5 mb-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[var(--neutral-amber)]" />
                <h3 className="text-heading-sm font-semibold text-[var(--text-primary)]">Board Review</h3>
              </div>
              <span className="text-sm font-display font-bold text-[var(--neutral-amber)]">Grade {latestBoardReview.grade}</span>
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{latestBoardReview.headline}</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{latestBoardReview.summary}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.18)] p-3">
                <span className="text-[10px] uppercase tracking-wider text-[var(--profit-green)]">Praise</span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{latestBoardReview.strengths[0]}</p>
              </div>
              <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-3">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Nudge</span>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{latestBoardReview.concerns[0]}</p>
              </div>
            </div>
            {latestBoardReview.objective && (
              <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--border)] p-3 mt-3">
                <span className="text-[10px] uppercase tracking-wider text-[var(--neutral-amber)]">New Objective</span>
                <p className="text-xs font-semibold text-[var(--text-primary)] mt-1">{latestBoardReview.objective.title}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{latestBoardReview.objective.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Advisor Feedback */}
        {advisorFeedback.length > 0 && (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-5 mb-4">
            <h3 className="text-heading-sm font-semibold text-[var(--text-primary)] mb-3">Advisor Feedback</h3>
            <div className="space-y-3">
              {advisorFeedback.map((note, idx) => (
                <div key={`${note.headline}-${idx}`} className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{note.headline}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase shrink-0 ${severityClass(note.severity)}`}>{note.severity}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{note.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* News Events */}
        {recentNews.length > 0 && (
          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-heading-sm font-semibold text-[var(--text-primary)] mb-3">Market News</h3>
            <div className="space-y-3">
              {recentNews.map((news) => (
                <div
                  key={news.id}
                  className={`p-3 rounded-lg border ${
                    news.impact === 'positive'
                      ? 'border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.05)]'
                      : news.impact === 'negative'
                      ? 'border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.05)]'
                      : 'border-[var(--border)] bg-[var(--surface-1)]'
                  }`}
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{news.headline}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Continue hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          className="text-center text-xs text-[var(--text-muted)] mt-6"
        >
          Continuing in a moment...
        </motion.p>
      </motion.div>
    </div>
  );
}
