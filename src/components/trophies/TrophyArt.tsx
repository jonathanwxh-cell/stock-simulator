import { useId, type ReactNode } from 'react';
import type { TrophyDefinition, TrophyRarity } from '../../engine/trophySystem';

const RARITY_COLORS: Record<TrophyRarity, { primary: string; secondary: string; glow: string }> = {
  bronze: { primary: '#CD7F32', secondary: '#F59E0B', glow: 'rgba(205,127,50,0.35)' },
  silver: { primary: '#CBD5E1', secondary: '#60A5FA', glow: 'rgba(148,163,184,0.38)' },
  gold: { primary: '#FACC15', secondary: '#F97316', glow: 'rgba(250,204,21,0.42)' },
  prismatic: { primary: '#22D3EE', secondary: '#A855F7', glow: 'rgba(168,85,247,0.5)' },
};

function motif(definition: TrophyDefinition, primary: string, secondary: string): ReactNode {
  const stroke = { stroke: primary, strokeWidth: 4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  const accent = { fill: secondary };

  switch (definition.artKey) {
    case 'opening_bell':
      return <><path d="M48 70h32l-5-8V43c0-10-7-18-16-18s-16 8-16 18v19l-5 8Z" {...stroke} /><path d="M55 77h18" {...stroke} /><circle cx="64" cy="82" r="4" {...accent} /></>;
    case 'green_ticket':
      return <><path d="M36 44h56v14c-7 0-7 12 0 12v14H36V70c7 0 7-12 0-12V44Z" {...stroke} /><path d="M54 50v28M68 50v28" {...stroke} /></>;
    case 'profit_stamp':
      return <><path d="M45 37h38v22H45zM39 74h50v15H39z" {...stroke} /><path d="M50 74l5-15h18l5 15M53 83h22" {...stroke} /></>;
    case 'watch_star':
      return <><path d="m64 32 8 18 19 2-14 13 4 19-17-10-17 10 4-19-14-13 19-2 8-18Z" {...stroke} /><circle cx="64" cy="64" r="24" {...stroke} /></>;
    case 'calendar_gate':
      return <><path d="M38 41h52v46H38zM38 54h52M50 34v12M78 34v12" {...stroke} /><path d="M51 65h10v10H51zM68 65h10v10H68z" {...accent} /></>;
    case 'board_table':
      return <><path d="M34 54h60v19H34zM42 73l-6 16M86 73l6 16M48 45h32" {...stroke} /><circle cx="48" cy="42" r="6" {...accent} /><circle cx="64" cy="38" r="6" {...accent} /><circle cx="80" cy="42" r="6" {...accent} /></>;
    case 'clock_order':
      return <><circle cx="64" cy="60" r="28" {...stroke} /><path d="M64 43v18l13 8" {...stroke} /><path d="M42 91h44" {...stroke} /></>;
    case 'career_flame':
      return <><path d="M64 92c15-8 22-19 18-32-3-10-11-15-12-28-10 8-8 18-7 25-8-4-10-12-9-19-12 9-18 21-14 35 3 10 11 16 24 19Z" {...stroke} /><path d="M64 80c7-4 10-10 7-17-2-4-5-7-6-12-5 5-7 11-6 17-4-2-5-5-5-9-5 6-5 15 10 21Z" {...accent} /></>;
    case 'growth_vine':
      return <><path d="M44 84c21-21 20-38 20-55M64 55c8-14 20-15 28-10-4 12-16 17-28 10ZM61 69c-12-10-23-8-29 0 7 10 19 12 29 0Z" {...stroke} /></>;
    case 'coin_fountain':
      return <><ellipse cx="64" cy="78" rx="28" ry="10" {...stroke} /><path d="M45 78V64c8 7 30 7 38 0v14M48 53c6-12 26-12 32 0M57 41c3-7 11-7 14 0" {...stroke} /><circle cx="64" cy="31" r="7" {...accent} /></>;
    case 'macro_compass':
      return <><circle cx="64" cy="64" r="29" {...stroke} /><path d="m64 36 9 28-9 28-9-28 9-28Z" {...stroke} /><circle cx="64" cy="64" r="5" {...accent} /></>;
    case 'contrarian_mask':
      return <><path d="M38 50c16-8 36-8 52 0-2 24-12 35-26 35S40 74 38 50Z" {...stroke} /><path d="M49 62h14M65 62h14M56 74c5 4 11 4 16 0" {...stroke} /></>;
    case 'short_anchor':
      return <><path d="M64 32v47M51 45h26M45 87c8 7 30 7 38 0M45 74c-2 12 6 20 19 20s21-8 19-20" {...stroke} /><circle cx="64" cy="30" r="6" {...stroke} /></>;
    case 'long_laurel':
      return <><path d="M48 83c-11-16-8-35 4-48M80 83c11-16 8-35-4-48" {...stroke} /><path d="M48 47c-9-1-14 4-15 11 8 1 14-3 15-11ZM80 47c9-1 14 4 15 11-8 1-14-3-15-11ZM64 38l8 17 19 2-14 13 4 18-17-9-17 9 4-18-14-13 19-2 8-17Z" {...stroke} /></>;
    case 'small_rocket':
      return <><path d="M64 32c15 9 20 23 14 42l-14 14-14-14c-6-19-1-33 14-42Z" {...stroke} /><circle cx="64" cy="55" r="7" {...accent} /><path d="M50 74l-14 11 9-19M78 74l14 11-9-19M58 89l6 10 6-10" {...stroke} /></>;
    case 'bear_shield':
      return <><path d="M64 33 89 43v19c0 17-9 28-25 34-16-6-25-17-25-34V43l25-10Z" {...stroke} /><path d="M51 64c4-8 22-8 26 0M54 75h20" {...stroke} /></>;
    case 'dividend_tree':
      return <><path d="M64 89V48M50 89h28M64 53c-13 0-23-8-24-20 13 0 23 8 24 20ZM65 64c16 0 25-9 26-22-16 0-25 9-26 22Z" {...stroke} /><circle cx="57" cy="39" r="5" {...accent} /><circle cx="76" cy="53" r="5" {...accent} /></>;
    case 'alpha_arrow':
      return <><path d="M37 83 58 62l13 12 22-30" {...stroke} /><path d="M80 42h13v13" {...stroke} /><path d="M39 92h52" {...stroke} /></>;
    case 'market_crown':
      return <><path d="M40 76h48l5-32-18 14-11-22-11 22-18-14 5 32ZM43 85h42" {...stroke} /><circle cx="64" cy="34" r="5" {...accent} /></>;
    case 'six_figure_vault':
      return <><rect x="37" y="50" width="54" height="38" rx="6" {...stroke} /><path d="M45 50v-5c0-11 8-19 19-19s19 8 19 19v5" {...stroke} /><circle cx="64" cy="69" r="9" {...accent} /><path d="M64 60v18M55 69h18" stroke="#0B0F14" strokeWidth="3" strokeLinecap="round" /></>;
    case 'million_tower':
      return <><path d="M47 90V42l17-11 17 11v48M40 90h48M56 51h16M56 63h16M56 75h16" {...stroke} /><path d="M64 31V19" {...stroke} /><circle cx="64" cy="18" r="5" {...accent} /></>;
    case 'crystal_grade':
      return <><path d="M64 28 88 48 80 88H48l-8-40 24-20Z" {...stroke} /><path d="M40 48h48M64 28 54 48l10 40 10-40-10-20Z" {...stroke} /><path d="M55 66h18" {...accent} /></>;
    case 'season_bridge':
      return <><path d="M34 78c13-24 47-24 60 0M40 78h48M48 78V64M64 78V56M80 78V64" {...stroke} /><path d="M41 90h46" {...stroke} /></>;
    case 'streak_obelisk':
      return <><path d="M53 91V43l11-17 11 17v48H53Z" {...stroke} /><path d="M57 53h14M57 66h14M57 79h14" {...stroke} /><path d="M43 91h42" {...stroke} /></>;
    case 'calm_shield':
      return <><path d="M64 34 88 44v19c0 16-8 26-24 33-16-7-24-17-24-33V44l24-10Z" {...stroke} /><path d="M52 64h24M64 52v24" {...stroke} /></>;
    case 'no_margin_wings':
      return <><path d="M64 76c-9-8-10-19 0-31 10 12 9 23 0 31Z" {...stroke} /><path d="M56 55c-13-12-26-9-32 2 10 10 22 12 32-2ZM72 55c13-12 26-9 32 2-10 10-22 12-32-2Z" {...stroke} /></>;
    case 'long_only_crest':
      return <><path d="M64 31 88 43v17c0 17-8 29-24 37-16-8-24-20-24-37V43l24-12Z" {...stroke} /><path d="M52 68 61 77 78 55" {...stroke} /></>;
    case 'phoenix_chart':
      return <><path d="M42 82c14-8 10-25 22-35 12 10 8 27 22 35-12 3-22 0-22-13 0 13-10 16-22 13Z" {...stroke} /><path d="M38 93h52M42 61l11-11 10 9 19-22" {...stroke} /></>;
    case 'cash_cushion':
      return <><rect x="35" y="55" width="58" height="31" rx="10" {...stroke} /><path d="M45 55c0-12 8-20 19-20s19 8 19 20M56 72h16" {...stroke} /><circle cx="64" cy="72" r="14" {...accent} opacity="0.28" /></>;
    case 'sector_wheel':
      return <><circle cx="64" cy="64" r="29" {...stroke} /><path d="M64 35v58M35 64h58M43 43l42 42M85 43 43 85" {...stroke} /><circle cx="64" cy="64" r="8" {...accent} /></>;
    case 'dividend_cup':
      return <><path d="M46 42h36v19c0 12-7 21-18 21s-18-9-18-21V42Z" {...stroke} /><path d="M82 48h7c0 13-5 20-13 20M46 48h-7c0 13 5 20 13 20M56 91h16M64 82v9" {...stroke} /></>;
    case 'catalyst_spark':
      return <><path d="m64 28 7 24 24 7-24 7-7 24-7-24-24-7 24-7 7-24Z" {...stroke} /><path d="m88 33 3 10 10 3-10 3-3 10-3-10-10-3 10-3 3-10Z" {...accent} /></>;
    case 'explorer_map':
      return <><path d="M36 42 52 36l24 8 16-6v48l-16 6-24-8-16 6V42Z" {...stroke} /><path d="M52 36v48M76 44v48M45 58h10M70 69h11" {...stroke} /></>;
    case 'challenge_prism':
      return <><path d="M64 28 90 49 80 89H48L38 49l26-21Z" {...stroke} /><path d="M38 49h52M64 28v61M48 89l16-40 16 40" {...stroke} /><circle cx="64" cy="49" r="6" {...accent} /></>;
  }
}

export default function TrophyArt({
  definition,
  unlocked,
  className = '',
}: {
  definition: TrophyDefinition;
  unlocked: boolean;
  className?: string;
}) {
  const gradientId = `trophyGradient${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const colors = RARITY_COLORS[definition.rarity];
  const mutedPrimary = '#64748B';
  const mutedSecondary = '#1F2937';
  const primary = unlocked ? colors.primary : mutedPrimary;
  const secondary = unlocked ? colors.secondary : mutedSecondary;

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-2xl border ${className}`}
      style={{
        borderColor: unlocked ? `${primary}66` : 'var(--border)',
        background: unlocked
          ? `radial-gradient(circle at 35% 20%, ${colors.glow}, transparent 36%), linear-gradient(145deg, rgba(15,23,42,0.96), rgba(3,7,18,0.98))`
          : 'linear-gradient(145deg, rgba(31,41,55,0.6), rgba(3,7,18,0.95))',
        boxShadow: unlocked ? `0 0 28px ${colors.glow}` : undefined,
      }}
    >
      <svg viewBox="0 0 128 128" className={`h-full w-full ${unlocked ? '' : 'grayscale opacity-55'}`} role="img" aria-label={definition.title}>
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={primary} stopOpacity="0.95" />
            <stop offset="100%" stopColor={secondary} stopOpacity="0.85" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r="50" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" strokeDasharray="6 8" opacity={unlocked ? 0.9 : 0.4} />
        <circle cx="64" cy="64" r="42" fill={unlocked ? 'rgba(15,23,42,0.55)' : 'rgba(15,23,42,0.75)'} stroke={unlocked ? `${primary}44` : '#334155'} />
        {motif(definition, primary, secondary)}
      </svg>
      {!unlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(3,7,18,0.22)]">
          <span className="rounded-full border border-[var(--border)] bg-[rgba(3,7,18,0.72)] px-2 py-1 text-xs font-mono-data text-[var(--text-muted)]">LOCKED</span>
        </div>
      )}
    </div>
  );
}

export { RARITY_COLORS };
