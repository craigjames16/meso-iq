// Pure operations on one exercise's ordered set list. The array order is the
// display order: each main set is followed by its attached sets.
import type { AttachedSetType, ClientSetType, ExerciseSet } from './types';

export const isAttached = (s: ExerciseSet): boolean => s.subSetNumber != null;

/** [start, end) of the group a set belongs to: its main set plus attached sets. */
export function groupRange(sets: ExerciseSet[], index: number): [number, number] {
  let start = index;
  while (start > 0 && isAttached(sets[start])) start -= 1;
  let end = start + 1;
  while (end < sets.length && isAttached(sets[end])) end += 1;
  return [start, end];
}

/** Numbers main sets 1..n in order; attached sets take their parent's number and 1..k. */
export function renumber(sets: ExerciseSet[]): ExerciseSet[] {
  let main = 0;
  let sub = 0;
  return sets.map((s) => {
    if (!isAttached(s) || main === 0) {
      main += 1;
      sub = 0;
      return { ...s, setNumber: main, subSetNumber: null };
    }
    sub += 1;
    return { ...s, setNumber: main, subSetNumber: sub };
  });
}

function blankMain(template?: ExerciseSet): ExerciseSet {
  return {
    reps: template?.reps ?? 0,
    weight: template?.weight ?? 0,
    setNumber: 0,
    subSetNumber: null,
    setType: 'REGULAR',
    completed: false,
  };
}

/** A copy of the set's values as a new, unlogged main set after its group. */
export function duplicateSet(sets: ExerciseSet[], index: number): ExerciseSet[] {
  const [start, end] = groupRange(sets, index);
  const next = [...sets];
  next.splice(end, 0, blankMain(sets[start]));
  return renumber(next);
}

/** A blank main set after the set's group. */
export function insertSetBelow(sets: ExerciseSet[], index: number): ExerciseSet[] {
  const [, end] = groupRange(sets, index);
  const next = [...sets];
  next.splice(end, 0, blankMain());
  return renumber(next);
}

/** Removes a set. Removing a main set removes its attached sets too. */
export function deleteSet(sets: ExerciseSet[], index: number): { sets: ExerciseSet[]; removed: ExerciseSet[] } {
  const [start, end] = isAttached(sets[index]) ? [index, index + 1] : groupRange(sets, index);
  const removed = sets.slice(start, end);
  const next = [...sets.slice(0, start), ...sets.slice(end)];
  return { sets: renumber(next), removed };
}

/** Appends a main set after the last set. */
export function addSet(sets: ExerciseSet[]): ExerciseSet[] {
  return renumber([...sets, blankMain()]);
}

/** Adds one attached set at the end of the parent's group, prefilled from the row above it. */
export function addAttached(sets: ExerciseSet[], parentIndex: number, type: AttachedSetType): ExerciseSet[] {
  const [start, end] = groupRange(sets, parentIndex);
  const above = sets[end - 1];
  const next = [...sets];
  next.splice(end, 0, {
    reps: above?.reps ?? 0,
    weight: above?.weight ?? 0,
    setNumber: sets[start].setNumber,
    subSetNumber: 1,
    setType: type,
    completed: false,
  });
  return renumber(next);
}

/** The attached sets of a main set. */
export function attachedOf(sets: ExerciseSet[], parentIndex: number): ExerciseSet[] {
  const [start, end] = groupRange(sets, parentIndex);
  return sets.slice(start + 1, end);
}

/** Sets a main set's type and its attached sets' types. Straight sets lose their attached sets. */
export function changeType(
  sets: ExerciseSet[],
  parentIndex: number,
  type: ClientSetType,
): { sets: ExerciseSet[]; removed: ExerciseSet[] } {
  const [start, end] = groupRange(sets, parentIndex);
  if (type === 'REGULAR') {
    const removed = sets.slice(start + 1, end);
    const next = [...sets.slice(0, start), { ...sets[start], setType: type }, ...sets.slice(end)];
    return { sets: renumber(next), removed };
  }
  const group = sets.slice(start, end).map((s) => ({ ...s, setType: type }));
  let next = [...sets.slice(0, start), ...group, ...sets.slice(end)];
  if (end - start === 1) next = addAttached(next, start, type);
  return { sets: renumber(next), removed: [] };
}

/** Saved sets whose numbers differ between two versions of the list, keyed by id. */
export function renumberedSaved(before: ExerciseSet[], after: ExerciseSet[]): ExerciseSet[] {
  const old = new Map(before.filter((s) => s.id != null).map((s) => [s.id as number, s]));
  return after.filter((s) => {
    if (s.id == null) return false;
    const prev = old.get(s.id);
    return !!prev && (prev.setNumber !== s.setNumber || (prev.subSetNumber ?? null) !== (s.subSetNumber ?? null));
  });
}

const ATTACHED_PREFIX: Record<AttachedSetType, string> = {
  DROP_SET: 'D',
  REST_PAUSE: '+',
  MYO_REP: 'M',
};

export function attachedPrefix(type: ClientSetType | undefined): string {
  return type && type !== 'REGULAR' ? ATTACHED_PREFIX[type] : 'D';
}

/** Badge text: "2" for a main set, "D1", "+1" or "M1" for attached sets. */
export function badgeLabel(set: ExerciseSet, parentType?: ClientSetType): string {
  if (!isAttached(set)) return String(set.setNumber ?? '');
  const type = set.setType && set.setType !== 'REGULAR' ? set.setType : parentType;
  return `${attachedPrefix(type)}${set.subSetNumber}`;
}

export const ADD_ATTACHED_LABEL: Record<AttachedSetType, string> = {
  DROP_SET: '+ Add drop',
  REST_PAUSE: '+ Add burst',
  MYO_REP: '+ Add myo set',
};

/** Completed main sets over all main sets. */
export function mainSetProgress(sets: ExerciseSet[]): { done: number; total: number } {
  const main = sets.filter((s) => !isAttached(s));
  return { done: main.filter((s) => s.completed).length, total: main.length };
}
