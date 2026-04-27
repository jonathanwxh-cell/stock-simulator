import { useCallback, useEffect, useRef } from 'react';
import {
  playBuy, playSell, playShort, playCover,
  playDividend, playBankrupt, playGameOver,
  playTurn, playNews, playMarginCall,
  playLevelUp, playClick, playError,
  setVolume, unlockAudio,
} from '@/audio/audioEngine';
import {
  playTitleMusic, playGameplayMusic, stopAllMusic, resumeMusic,
} from '@/audio/musicEngine';
import type { Screen } from '@/engine/types';

interface AudioOptions {
  soundEnabled: boolean;
  musicEnabled: boolean;
  screen: Screen;
}

/**
 * Audio hook — accepts settings + screen directly to avoid circular context dependency.
 * Can be used inside GameProvider (pass state) or outside (call useGame() there).
 *
 * All SFX methods are individually memoized via useCallback keyed on [soundEnabled],
 * so GameContext callbacks that reference audio.buy etc. remain stable across renders.
 */
export function useAudio(opts: AudioOptions) {
  const { soundEnabled, musicEnabled, screen } = opts;
  const wasMusicEnabled = useRef(musicEnabled);
  const prevScreen = useRef(screen);
  const wasHidden = useRef(false);

  // Core trigger — stable reference, re-created only when soundEnabled changes
  const trigger = useCallback((fn: () => Promise<void>) => {
    if (soundEnabled) fn().catch(e => console.warn('audio:', e));
  }, [soundEnabled]);

  // Memoized SFX methods — each is stable unless soundEnabled changes
  const buy = useCallback(() => trigger(playBuy), [trigger]);
  const sell = useCallback(() => trigger(playSell), [trigger]);
  const short = useCallback(() => trigger(playShort), [trigger]);
  const cover = useCallback(() => trigger(playCover), [trigger]);
  const dividend = useCallback(() => trigger(playDividend), [trigger]);
  const bankrupt = useCallback(() => trigger(playBankrupt), [trigger]);
  const gameOver = useCallback(() => trigger(playGameOver), [trigger]);
  const turn = useCallback(() => trigger(playTurn), [trigger]);
  const news = useCallback(() => trigger(playNews), [trigger]);
  const marginCall = useCallback(() => trigger(playMarginCall), [trigger]);
  const levelUp = useCallback(() => trigger(playLevelUp), [trigger]);
  const click = useCallback(() => trigger(playClick), [trigger]);
  const error = useCallback(() => trigger(playError), [trigger]);
  const setVol = useCallback((v: number) => setVolume(v), []);

  // Music: gate on musicEnabled, track screen changes
  useEffect(() => {
    if (!musicEnabled) {
      stopAllMusic();
      wasMusicEnabled.current = false;
      return;
    }

    // If music was just toggled back on, resume for current screen
    if (!wasMusicEnabled.current) {
      resumeMusic(screen);
      wasMusicEnabled.current = true;
      prevScreen.current = screen;
      return;
    }

    // Screen change — switch tracks
    if (prevScreen.current !== screen) {
      if (screen === 'title') {
        playTitleMusic();
      } else if (screen === 'game') {
        playGameplayMusic();
      } else if (screen === 'game-over') {
        stopAllMusic();
      }
      // Other screens (stock-market, stock-detail, portfolio, news, next-turn,
      // leaderboard, settings, how-to-play, load-save) inherit the parent
      // screen's music — submenu screens shouldn't interrupt the vibe.
      prevScreen.current = screen;
    }
  }, [screen, musicEnabled]);

  // Tab blur — pause/resume music
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        wasHidden.current = true;
        stopAllMusic();
      } else if (wasHidden.current && musicEnabled) {
        wasHidden.current = false;
        resumeMusic(screen);
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [musicEnabled, screen]);

  return {
    unlock: unlockAudio,
    // SFX — all memoized, stable references
    buy, sell, short, cover,
    dividend, bankrupt, gameOver,
    turn, news, marginCall,
    levelUp, click, error,
    setVolume: setVol,
  };
}
