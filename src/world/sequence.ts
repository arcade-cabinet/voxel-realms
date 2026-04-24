import { REALM_ARCHETYPE_IDS, type RealmArchetypeId } from "@world/climber";

export interface RealmSequenceEntry {
  baseSeed: string;
  seed: string;
  realmIndex: number;
  cycle: number;
  slot: number;
  archetype: RealmArchetypeId;
}

export function createRealmSequenceEntry(baseSeed: string, realmIndex: number): RealmSequenceEntry {
  const safeIndex = Math.max(0, Math.round(realmIndex));
  const cycle = Math.floor(safeIndex / REALM_ARCHETYPE_IDS.length);
  const slot = safeIndex % REALM_ARCHETYPE_IDS.length;
  const archetypeDeck = createArchetypeDeck(baseSeed, cycle);

  return {
    baseSeed,
    seed: createRealmSeed(baseSeed, safeIndex),
    realmIndex: safeIndex,
    cycle,
    slot,
    archetype: archetypeDeck[slot],
  };
}

export function createRealmSequence(baseSeed: string, count: number): RealmSequenceEntry[] {
  return Array.from({ length: Math.max(0, Math.round(count)) }, (_, index) =>
    createRealmSequenceEntry(baseSeed, index)
  );
}

function createRealmSeed(baseSeed: string, realmIndex: number) {
  return realmIndex === 0 ? baseSeed : `${baseSeed}-realm-${realmIndex + 1}`;
}

function createArchetypeDeck(baseSeed: string, cycle: number): RealmArchetypeId[] {
  const deck = [...REALM_ARCHETYPE_IDS];
  const random = createRng(`${baseSeed}:realm-cycle:${cycle}`);

  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}

function createRng(seed: string) {
  let state = hashString(seed);

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(input: string): number {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
