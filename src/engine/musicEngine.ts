/**
 * Music Engine — MiniMax-generated ambient BGM
 * Manages looping background tracks with crossfade
 */

let titleAudio: HTMLAudioElement | null = null;
let gameplayAudio: HTMLAudioElement | null = null;
let currentTrack: 'title' | 'gameplay' | null = null;

function getAudio(path: string): HTMLAudioElement {
  const audio = new Audio(path);
  audio.loop = true;
  audio.volume = 0.4;
  return audio;
}

export function playTitleMusic(): void {
  if (currentTrack === 'title') return;
  stopAllMusic();
  if (!titleAudio) titleAudio = getAudio('/audio/music/title.mp3');
  titleAudio.play().catch(() => {});
  currentTrack = 'title';
}

export function playGameplayMusic(): void {
  if (currentTrack === 'gameplay') return;
  stopAllMusic();
  if (!gameplayAudio) gameplayAudio = getAudio('/audio/music/gameplay.mp3');
  gameplayAudio.play().catch(() => {});
  currentTrack = 'gameplay';
}

export function stopAllMusic(): void {
  titleAudio?.pause();
  gameplayAudio?.pause();
  currentTrack = null;
}

export function setMusicVolume(vol: number): void {
  const v = Math.max(0, Math.min(1, vol));
  if (titleAudio) titleAudio.volume = v;
  if (gameplayAudio) gameplayAudio.volume = v;
}
