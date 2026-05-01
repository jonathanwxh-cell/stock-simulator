import type { Mission } from '../engine/types';

function signedPct(value: number): string {
  if (Math.abs(value) < 0.05) return '0.0%';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

function riskScoreFromBuffer(mission: Mission): number {
  return Math.max(0, Math.min(100, 100 - mission.progress));
}

export function getMissionProgressLabel(mission: Mission): string {
  if (mission.id.includes('alpha')) return `Alpha: ${signedPct(mission.progress)}`;
  if (mission.id.includes('risk')) return `Current Risk Score: ${riskScoreFromBuffer(mission).toFixed(0)}/100`;
  if (mission.id.includes('diversify')) return `Sectors held: ${mission.progress.toFixed(0)} / ${mission.target.toFixed(0)}`;
  if (mission.id.includes('growth')) return `Growth: ${signedPct(mission.progress)}`;
  return `Progress: ${mission.progress.toFixed(1)} / ${mission.target}`;
}

export function getMissionTargetLabel(mission: Mission): string {
  if (mission.id.includes('alpha')) return `Target: ${signedPct(mission.target)}`;
  if (mission.id.includes('risk')) return `Limit: below ${(100 - mission.target).toFixed(0)}`;
  if (mission.id.includes('diversify')) return `Target: ${mission.target.toFixed(0)} sectors`;
  if (mission.id.includes('growth')) return `Target: ${signedPct(mission.target)}`;
  return `Target: ${mission.target}`;
}

export function getMissionProgressPercent(mission: Mission): number {
  const target = Math.max(1, mission.target);
  if (mission.id.includes('alpha') || mission.id.includes('growth')) {
    return Math.max(0, Math.min(100, (mission.progress / target) * 100));
  }
  if (mission.id.includes('risk')) {
    return Math.max(0, Math.min(100, (mission.progress / target) * 100));
  }
  return Math.max(0, Math.min(100, (mission.progress / target) * 100));
}

export function getMissionSummary(mission: Mission): string {
  if (mission.id.includes('risk')) return `Risk score ${riskScoreFromBuffer(mission).toFixed(0)}/100, limit below ${(100 - mission.target).toFixed(0)}`;
  if (mission.id.includes('diversify')) return `Sectors held ${mission.progress.toFixed(0)}/${mission.target.toFixed(0)}, target ${mission.target.toFixed(0)}`;
  if (mission.id.includes('growth')) return `Growth ${signedPct(mission.progress)}, target ${signedPct(mission.target)}`;
  if (mission.id.includes('alpha')) return `Alpha ${signedPct(mission.progress)}, target ${signedPct(mission.target)}`;
  return `${getMissionProgressLabel(mission)} · ${getMissionTargetLabel(mission)}`;
}
