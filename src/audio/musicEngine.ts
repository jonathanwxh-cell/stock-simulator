/**
 * Music Engine — MiniMax-generated ambient BGM
 * Manages looping background tracks with 500ms crossfade
 */

const FADE_DURATION = 500;
const FADE_STEPS = 15;
const TARGET_VOLUME = 0.4;

let titleAudio: HTMLAudioElement | null = null;
let gameplayAudio: HTMLAudioElement | null = null;
let currentTrack: 'title' | 'gameplay' | null = null;
let fadeInterval: ReturnType<typeof setInterval> | null = null;

function getAudio(path: string): HTMLAudioElement {
  const audio = new Audio(path);
  audio.loop = true;
  audio.volume = 0;
  return audio;
}

function cancelFade(): void {
  if (fadeInterval !== null) {
    clearInterval(fadeInterval);
    fadeInterval = null;
  }
}

function crossfade(outgoing: HTMLAudioElement | null, incoming: HTMLAudioElement): void {
  cancelFade();

  const stepMs = FADE_DURATION / FADE_STEPS;
  const outStart = outgoing?.volume ?? 0;
  const inStart = 0;
  let step = 0;

  fadeInterval = setInterval(() => {
    step++;
    const t = step / FADE_STEPS;

    if (outgoing) {
      outgoing.volume = Math.max(0, outStart * (1 - t));
    }
    incoming.volume = Math.min(TARGET_VOLUME, inStart + TARGET_VOLUME * t);

    if (step >= FADE_STEPS) {
      cancelFade();
      if (outgoing !== incoming) outgoing?.pause();
      incoming.volume = TARGET_VOLUME;
    }
  }, stepMs);
}

function playTrack(track: 'title' | 'gameplay'): void {
  // Lazy-init audio elements
  if (!titleAudio) titleAudio = getAudio('/audio/music/title.mp3');
  if (!gameplayAudio) gameplayAudio = getAudio('/audio/music/gameplay.mp3');

  const incoming = track === 'title' ? titleAudio : gameplayAudio;

  // Already playing this track and not paused — nothing to do
  if (currentTrack === track && !incoming.paused) return;

  const outgoing = currentTrack === 'title' ? titleAudio
    : currentTrack === 'gameplay' ? gameplayAudio
    : null;

  // Set volume to 0 BEFORE play to prevent one-frame volume leak
  incoming.currentTime = 0;
  incoming.volume = 0;
  incoming.play().catch(e => {
    if (e.name === 'NotAllowedError') return; // Expected before user gesture
    console.warn('audio:', e);
  });

  crossfade(outgoing, incoming);
  currentTrack = track;
}

export function playTitleMusic(): void {
  playTrack('title');
}

export function playGameplayMusic(): void {
  playTrack('gameplay');
}

export function stopAllMusic(): void {
  cancelFade();
  if (titleAudio) { titleAudio.pause(); titleAudio.volume = 0; }
  if (gameplayAudio) { gameplayAudio.pause(); gameplayAudio.volume = 0; }
  currentTrack = null;
}

export function isPlaying(): boolean {
  return currentTrack !== null;
}

export function resumeMusic(screen: 'title' | 'game' | string): void {
  if (screen === 'title') playTitleMusic();
  else if (screen === 'game') playGameplayMusic();
}
