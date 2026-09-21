import type { SetRecord } from './types';

/** A main set has no subSetNumber. Drop, rest-pause and myo-rep children are attached sets. */
export const isMainSet = (s: SetRecord): boolean => s.subSetNumber == null;

/** A main set with reps logged. Set counts and hard sets count these only. */
export const isHardSet = (s: SetRecord): boolean => isMainSet(s) && s.reps > 0;

/** Main sets from 1 to 15 reps with weight. Above 15 reps the Epley estimate is unreliable. */
export const isE1rmEligible = (s: SetRecord): boolean =>
  isMainSet(s) && s.weight > 0 && s.reps >= 1 && s.reps <= 15;

/** weight × reps summed over every set, attached sets included. */
export function volume(sets: SetRecord[]): number {
  return sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

export function hardSetCount(sets: SetRecord[]): number {
  return sets.filter(isHardSet).length;
}
