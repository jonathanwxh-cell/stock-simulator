import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import type { CareerStyle, ChallengeModeId, Difficulty } from '../engine/types';
import { getSaveMetadata } from '../engine/saveSystem';
import type { SaveMetadata } from '../engine/types';
import TitleBackground from './title/TitleBackground';
import TitleMenu from './title/TitleMenu';
import NewGameOverlay from './title/NewGameOverlay';

export default function TitleScreen() {
  const { navigateTo, newGame } = useGame();
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [selectedCareer, setSelectedCareer] = useState<CareerStyle>('balanced');
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeModeId>('standard');
  const [playerName, setPlayerName] = useState('');
  const [hasAutoSave, setHasAutoSave] = useState(false);
  const [loadDisabled, setLoadDisabled] = useState(true);

  useEffect(() => {
    getSaveMetadata().then((slots: SaveMetadata[]) => {
      const auto = slots.find((s) => s.slot === 'auto');
      setHasAutoSave(auto?.exists ?? false);
      const anySave = slots.some((s) => s.exists);
      setLoadDisabled(!anySave);
    });
  }, []);

  const handleMenuClick = useCallback((id: string) => {
    if (id === 'new-game') {
      setShowDifficulty(true);
      setSelectedDifficulty(null);
      setSelectedCareer('balanced');
      setSelectedChallenge('standard');
      setPlayerName('');
      return;
    }
    if (id === 'load-game') {
      if (!loadDisabled) navigateTo('load-save');
      return;
    }
    if (id === 'leaderboard') return navigateTo('leaderboard');
    if (id === 'trophy-room') return navigateTo('trophy-room');
    if (id === 'settings') return navigateTo('settings');
    if (id === 'how-to-play') return navigateTo('how-to-play');
  }, [navigateTo, loadDisabled]);

  const handleStartGame = useCallback(() => {
    if (selectedDifficulty && playerName.trim()) {
      newGame(playerName.trim(), selectedDifficulty, selectedCareer, selectedChallenge);
    }
  }, [selectedDifficulty, selectedCareer, selectedChallenge, playerName, newGame]);

  const handleAutoSaveContinue = useCallback(() => {
    navigateTo('load-save');
  }, [navigateTo]);

  return (
    <div className="min-h-[100dvh] w-full relative overflow-hidden flex flex-col items-center justify-center">
      <TitleBackground />
      <TitleMenu
        loadDisabled={loadDisabled}
        hasAutoSave={hasAutoSave}
        onMenuClick={handleMenuClick}
        onAutoSaveContinue={handleAutoSaveContinue}
      />
      <NewGameOverlay
        open={showDifficulty}
        selectedDifficulty={selectedDifficulty}
        selectedCareer={selectedCareer}
        selectedChallenge={selectedChallenge}
        playerName={playerName}
        onSelectDifficulty={setSelectedDifficulty}
        onSelectCareer={setSelectedCareer}
        onSelectChallenge={setSelectedChallenge}
        onChangePlayerName={setPlayerName}
        onClose={() => setShowDifficulty(false)}
        onStart={handleStartGame}
      />
    </div>
  );
}
