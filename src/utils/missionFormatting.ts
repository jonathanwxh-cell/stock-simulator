import type { Mission } from '../engine/types';

function signedPct(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function getMissionProgressLabel(mission: Mission): string {
  if (mission.id.includes('alpha')) return `Alpha: ${signedPct(mission.progress)}`;
  if (mission.id.includes('risk')) return `Risk Buffer: ${mission.progress.toFixed(0)}`;
  if (mission.id.includes('diversify')) return `Sectors held: ${mission.progress.toFixed(0)} / ${mission.target.toFixed(0)}`;
  if (mission.id.includes('growth')) return `Growth: ${signedPct(mission.progress)}`;
  return `Progress: ${mission.progress.toFixed(1)} / ${mission.target}`;
}

export function getMissionTargetLabel(mission: Mission): string {
  if (mission.id.includes('alpha')) return `Target: ${signedPct(mission.target)}`;
  if (mission.id.includes('risk')) return `Required: ≥ ${mission.target.toFixed(0)}`;
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
  return `${getMissionProgressLabel(mission)} · ${getMissionTargetLabel(mission)}`;
}
