/**
 * Seeded PRNG for reproducible gameplay.
 *
 * Production code uses the default MathRandomRNG (same behavior as before).
 * Tests pass a SeededRNG to get deterministic, reproducible sequences.
 */

export interface RNG {
  /** Returns [0, 1) */
  next(): number;
  /** Inclusive integer in [min, max] */
  int(min: number, max: number): number;
  /** Continuous float in [min, max) */
  range(min: number, max: number): number;
  /** Pick one random element */
  pick<T>(arr: T[]): T;
  /** Fisher-Yates partial shuffle — pick n distinct elements */
  pickN<T>(arr: T[], n: number): T[];
}

/** Default RNG wrapping Math.random(). Used in production. */
export class MathRandomRNG implements RNG {
  next(): number {
    return Math.random();
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  range(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(this.next() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }
}

/** Mulberry32 — fast, small, good-enough 32-bit PRNG. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded deterministic RNG. Same seed → same sequence, every time. */
export class SeededRNG implements RNG {
  private _next: () => number;
  private _seed: number;
  private _callCount: number = 0;

  constructor(seed: number) {
    this._seed = seed;
    this._next = mulberry32(seed);
  }

  next(): number {
    this._callCount++;
    return this._next();
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  range(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  pickN<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const count = Math.min(n, copy.length);
    for (let i = 0; i < count; i++) {
      const j = i + Math.floor(this.next() * (copy.length - i));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
  }

  getSeed(): number {
    return this._seed;
  }

  getCallCount(): number {
    return this._callCount;
  }
}

/** Shared default instance for production use. */
export const defaultRNG: RNG = new MathRandomRNG();
