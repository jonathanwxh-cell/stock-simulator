import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GameProvider, useGame } from './context/GameContext';
import Layout from './components/Layout';
import TitleScreen from './pages/TitleScreen';
import GameHUD from './pages/GameHUD';
import StockMarket from './pages/StockMarket';
import StockDetail from './pages/StockDetail';
import Portfolio from './pages/Portfolio';
import NewsPanel from './pages/NewsPanel';
import NextTurn from './pages/NextTurn';
import GameOver from './pages/GameOver';
import LeaderboardPage from './pages/LeaderboardPage';
import SettingsPage from './pages/SettingsPage';
import HowToPlay from './pages/HowToPlay';
import LoadSave from './pages/LoadSave';

function ScreenRouter() {
  const { screen } = useGame();

  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'game':
      return <GameHUD />;
    case 'stock-market':
      return <StockMarket />;
    case 'stock-detail':
      return <StockDetail />;
    case 'portfolio':
      return <Portfolio />;
    case 'news':
      return <NewsPanel />;
    case 'next-turn':
      return <NextTurn />;
    case 'game-over':
      return <GameOver />;
    case 'leaderboard':
      return <LeaderboardPage />;
    case 'settings':
      return <SettingsPage />;
    case 'how-to-play':
      return <HowToPlay />;
    case 'load-save':
      return <LoadSave />;
    default:
      return <TitleScreen />;
  }
}

function AudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      // Unlock audio context on first user interaction
      import('@/engine/audioEngine').then(m => m.playClick?.().catch(() => {}));
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock);
    document.addEventListener('touchstart', unlock);
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);
  return null;
}

function AppContent() {
  return (
    <Layout>
      <AudioUnlock />
      <ScreenRouter />
    </Layout>
  );
}

export default function App() {
  return (
    <GameProvider>
      <Routes>
        <Route path="*" element={<AppContent />} />
      </Routes>
    </GameProvider>
  );
}
