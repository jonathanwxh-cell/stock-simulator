import { useGame } from '../context/GameContext';
import Navbar from './Navbar';
import Footer from './Footer';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { screen } = useGame();

  // Screens that show navbar + footer
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
    <div className="min-h-[100dvh] bg-[var(--void)] relative">
      {showNav && <Navbar />}

      <main
        className={`${showNav ? 'pt-14' : ''} ${showNav ? 'pb-[72px]' : ''} min-h-[100dvh]`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              duration: 0.35,
              ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
            }}
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {showNav && <Footer />}
    </div>
  );
}
