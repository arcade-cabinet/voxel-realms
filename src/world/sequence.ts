import { REALM_ARCHETYPE_IDS, type RealmArchetypeId } from "@world/climber";
import seedrandom from "seedrandom";

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
  const random = seedrandom(`${baseSeed}:realm-cycle:${cycle}`);

  for (let index = deck.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
  }

  return deck;
}
