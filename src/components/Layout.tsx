import { useGame } from '../context/GameContext';
import Navbar from './Navbar';
import Footer from './Footer';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { screen } = useGame();

  const gameScreens = [
    'game',
    'stock-market',
    'stock-detail',
    'portfolio',
    'news',
    'next-turn',
  ];

  const showNav = gameScreens.includes(screen);

  return (
    <div className="min-h-[100dvh] bg-[var(--void)] relative overflow-x-hidden">
      {showNav && <Navbar />}

      <main
        className={`${showNav ? 'pt-14 pb-[76px]' : ''} min-h-[100dvh]`}
      >
        <motion.div
          key={screen}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          className="min-h-full"
        >
          {children}
        </motion.div>
      </main>

      {showNav && <Footer />}
    </div>
  );
}
