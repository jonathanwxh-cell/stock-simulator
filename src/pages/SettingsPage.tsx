import { useGame } from '../context/GameContext';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX, Music, MicOff, Zap, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const { settings, updateSettings, goBack } = useGame();

  const toggle = (key: 'soundEnabled' | 'musicEnabled' | 'showTutorials') => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="min-h-[100dvh] p-6 max-w-lg mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={goBack} className="w-9 h-9 rounded-lg bg-[var(--surface-1)] border border-[var(--border)] flex items-center justify-center hover:bg-[var(--surface-2)]">
            <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)]" />
          </button>
          <h1 className="text-xl font-display font-bold text-[var(--text-primary)]">Settings</h1>
        </div>

        <div className="space-y-2">
          <button onClick={() => toggle('soundEnabled')} className="w-full flex items-center justify-between bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-all">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? <Volume2 className="w-5 h-5 text-[var(--profit-green)]" /> : <VolumeX className="w-5 h-5 text-[var(--text-muted)]" />}
              <span className="text-sm text-[var(--text-primary)]">Sound Effects</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.soundEnabled ? 'bg-[var(--profit-green)]' : 'bg-[var(--surface-2)]'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.soundEnabled ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          <button onClick={() => toggle('musicEnabled')} className="w-full flex items-center justify-between bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-all">
            <div className="flex items-center gap-3">
              {settings.musicEnabled ? <Music className="w-5 h-5 text-[var(--profit-green)]" /> : <MicOff className="w-5 h-5 text-[var(--text-muted)]" />}
              <span className="text-sm text-[var(--text-primary)]">Music</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.musicEnabled ? 'bg-[var(--profit-green)]' : 'bg-[var(--surface-2)]'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.musicEnabled ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          <button onClick={() => toggle('showTutorials')} className="w-full flex items-center justify-between bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border-hover)] transition-all">
            <div className="flex items-center gap-3">
              {settings.showTutorials ? <Eye className="w-5 h-5 text-[var(--profit-green)]" /> : <EyeOff className="w-5 h-5 text-[var(--text-muted)]" />}
              <span className="text-sm text-[var(--text-primary)]">Show Tutorials</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${settings.showTutorials ? 'bg-[var(--profit-green)]' : 'bg-[var(--surface-2)]'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${settings.showTutorials ? 'left-5' : 'left-1'}`} />
            </div>
          </button>

          <div className="bg-[var(--surface-0)] border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="w-5 h-5 text-[var(--neutral-amber)]" />
              <span className="text-sm text-[var(--text-primary)]">Animation Speed</span>
            </div>
            <div className="flex gap-2">
              {(['slow', 'normal', 'fast'] as const).map(speed => (
                <button key={speed} onClick={() => updateSettings({ animationSpeed: speed })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${settings.animationSpeed === speed ? 'bg-[var(--profit-green)] text-black' : 'bg-[var(--surface-1)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                  {speed.charAt(0).toUpperCase() + speed.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
