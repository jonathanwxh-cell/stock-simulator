import { useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import {
  playBuy, playSell, playShort, playCover,
  playDividend, playBankrupt, playGameOver,
  playTurn, playNews, playMarginCall,
  playLevelUp, playClick, playError,
  setVolume,
} from '@/engine/audioEngine';

export function useAudio() {
  const { settings } = useGame();
  const soundEnabled = settings?.soundEnabled ?? true;

  const trigger = useCallback((fn: () => void) => {
    if (soundEnabled) fn();
  }, [soundEnabled]);

  return {
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
