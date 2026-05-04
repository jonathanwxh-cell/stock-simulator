function pseudoRandom(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

const PARTICLES = Array.from({ length: 25 }).map((_, index) => ({
  id: index,
  size: 3 + pseudoRandom(index + 1) * 4,
  left: pseudoRandom(index + 101) * 100,
  delay: pseudoRandom(index + 201) * 20,
  duration: 15 + pseudoRandom(index + 301) * 10,
}));

export default function TitleBackground() {
  return (
    <>
      {/* Background layers */}
      <div className="absolute inset-0 z-0">
        <img
          src="/title-bg.png"
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        >
          <source src="/title-ambient.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 ambient-glow opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--void)]/40 via-transparent to-[var(--void)]/80" />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 z-[1] pointer-events-none overflow-hidden">
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-[var(--profit-green)] animate-float-up"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              bottom: '-10px',
              opacity: 0,
              animationDelay: `${particle.delay}s`,
              animationDuration: `${particle.duration}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
