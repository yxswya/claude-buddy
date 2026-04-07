/**
 * Pet Companion Generator
 *
 * Deterministic PRNG-based companion generation, aligned with claude-code/src/buddy/companion.ts
 */

import {
  type Pet,
  type PetBones,
  type StoredPet,
  type Species,
  type Rarity,
  type StatName,
  SPECIES,
  RARITIES,
  RARITY_WEIGHTS,
  EYES,
  HATS,
  STAT_NAMES,
  SPECIES_NAMES,
  SPECIES_PERSONALITY,
} from './types';

// ============================================================================
// PRNG — Mulberry32 (matches claude-code/src/buddy/companion.ts)
// ============================================================================

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  if (typeof Bun !== 'undefined') {
    return Number(BigInt(Bun.hash(s)) & 0xffffffffn);
  }
  // Fallback: FNV-1a
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// ============================================================================
// Stat rolling
// ============================================================================

const RARITY_FLOOR: Record<Rarity, number> = {
  common: 5,
  uncommon: 15,
  rare: 25,
  epic: 35,
  legendary: 50,
};

function rollRarity(rng: () => number): Rarity {
  const total = Object.values(RARITY_WEIGHTS).reduce((a, b) => a + b, 0);
  let roll = rng() * total;
  for (const rarity of RARITIES) {
    roll -= RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return 'common';
}

function rollStats(rng: () => number, rarity: Rarity): Record<StatName, number> {
  const floor = RARITY_FLOOR[rarity];
  const peak = pick(rng, STAT_NAMES);
  let dump = pick(rng, STAT_NAMES);
  while (dump === peak) dump = pick(rng, STAT_NAMES);

  const stats = {} as Record<StatName, number>;
  for (const name of STAT_NAMES) {
    if (name === peak) {
      stats[name] = Math.min(100, floor + 50 + Math.floor(rng() * 30));
    } else if (name === dump) {
      stats[name] = Math.max(1, floor - 10 + Math.floor(rng() * 15));
    } else {
      stats[name] = floor + Math.floor(rng() * 40);
    }
  }
  return stats;
}

// ============================================================================
// Roll generation (core logic matches claude-code exactly)
// ============================================================================

const SALT = 'friend-2026-401';

export type Roll = {
  bones: PetBones;
  inspirationSeed: number;
};

function rollFrom(rng: () => number): Roll {
  const rarity = rollRarity(rng);
  const bones: PetBones = {
    rarity,
    species: pick(rng, SPECIES),
    eye: pick(rng, EYES),
    hat: rarity === 'common' ? 'none' : pick(rng, HATS),
    shiny: rng() < 0.01,
    stats: rollStats(rng, rarity),
  };
  return { bones, inspirationSeed: Math.floor(rng() * 1e9) };
}

// Cache deterministic roll for same userId
let rollCache: { key: string; value: Roll } | undefined;

export function roll(userId: string): Roll {
  const key = userId + SALT;
  if (rollCache?.key === key) return rollCache.value;
  const value = rollFrom(mulberry32(hashString(key)));
  rollCache = { key, value };
  return value;
}

export function rollWithSeed(seed: string): Roll {
  return rollFrom(mulberry32(hashString(seed)));
}

export function generateSeed(): string {
  return `rehatch-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================================
// Buddy-specific: pet persistence via Electron userData
// ============================================================================

export function getPetFromSeed(stored: StoredPet): Pet {
  const seed = stored.seed ?? 'default-seed';
  const { bones } = rollWithSeed(seed);
  // bones last so stale bones fields in old-format configs get overridden
  return { ...stored, ...bones };
}

export function hatchPet(_userId?: string): Pet {
  const seed = generateSeed();
  const { bones } = rollWithSeed(seed);

  const name = SPECIES_NAMES[bones.species];
  const personality = SPECIES_PERSONALITY[bones.species];

  const stored: StoredPet = {
    name,
    personality,
    seed,
    hatchedAt: Date.now(),
  };

  return { ...stored, ...bones };
}

export function getDefaultName(species: Species): string {
  return SPECIES_NAMES[species];
}

export function getDefaultPersonality(species: Species): string {
  return SPECIES_PERSONALITY[species];
}
