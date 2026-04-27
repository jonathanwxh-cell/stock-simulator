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
 */
export function useAudio(opts: AudioOptions) {
  const { soundEnabled, musicEnabled, screen } = opts;
  const wasMusicEnabled = useRef(musicEnabled);
  const prevScreen = useRef(screen);
  const wasHidden = useRef(false);

  const trigger = useCallback((fn: () => Promise<void>) => {
    if (soundEnabled) fn().catch(e => console.warn('audio:', e));
  }, [soundEnabled]);

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
    // SFX
    buy: () => trigger(playBuy),
    sell: () => trigger(playSell),
    short: () => trigger(playShort),
    cover: () => trigger(playCover),
    dividend: () => trigger(playDividend),
    bankrupt: () => trigger(playBankrupt),
    gameOver: () => trigger(playGameOver),
    turn: () => trigger(playTurn),
    news: () => trigger(playNews),
    marginCall: () => trigger(playMarginCall),
    levelUp: () => trigger(playLevelUp),
    click: () => trigger(playClick),
    error: () => trigger(playError),
    setVolume,
  };
}
