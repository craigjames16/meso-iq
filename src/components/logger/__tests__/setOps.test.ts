import {
  addAttached,
  badgeLabel,
  changeType,
  deleteSet,
  duplicateSet,
  groupRange,
  insertSetBelow,
  mainSetProgress,
  renumberedSaved,
} from '../setOps';
import type { ExerciseSet } from '../types';

const main = (n: number, extra: Partial<ExerciseSet> = {}): ExerciseSet => ({
  weight: 100,
  reps: 10,
  setNumber: n,
  subSetNumber: null,
  setType: 'REGULAR',
  completed: false,
  ...extra,
});
const sub = (n: number, k: number, extra: Partial<ExerciseSet> = {}): ExerciseSet => ({
  weight: 80,
  reps: 6,
  setNumber: n,
  subSetNumber: k,
  setType: 'DROP_SET',
  completed: false,
  ...extra,
});
const numbers = (sets: ExerciseSet[]) => sets.map((s) => (s.subSetNumber == null ? `${s.setNumber}` : `${s.setNumber}.${s.subSetNumber}`));

describe('setOps', () => {
  const sets = [main(1), main(2, { setType: 'DROP_SET' }), sub(2, 1), sub(2, 2), main(3)];

  it('finds a group from its main set or an attached set', () => {
    expect(groupRange(sets, 1)).toEqual([1, 4]);
    expect(groupRange(sets, 3)).toEqual([1, 4]);
    expect(groupRange(sets, 4)).toEqual([4, 5]);
  });

  it('duplicates a set after its group and keeps numbering sequential', () => {
    const next = duplicateSet(sets, 0);
    expect(numbers(next)).toEqual(['1', '2', '3', '3.1', '3.2', '4']);
    expect(next[1]).toMatchObject({ weight: 100, reps: 10, completed: false });
  });

  it('inserts a blank set below a group', () => {
    expect(numbers(insertSetBelow(sets, 2))).toEqual(['1', '2', '2.1', '2.2', '3', '4']);
  });

  it('closes the gap when a set is deleted, with its attached sets', () => {
    const { sets: next, removed } = deleteSet(sets, 1);
    expect(numbers(next)).toEqual(['1', '2']);
    expect(removed).toHaveLength(3);
  });

  it('renumbers attached sets when one is deleted', () => {
    expect(numbers(deleteSet(sets, 2).sets)).toEqual(['1', '2', '2.1', '3']);
  });

  it('adds one attached set when a straight set becomes a drop set', () => {
    const { sets: next } = changeType([main(1)], 0, 'DROP_SET');
    expect(numbers(next)).toEqual(['1', '1.1']);
    expect(next[1].setType).toBe('DROP_SET');
  });

  it('removes attached sets when a set goes back to straight', () => {
    const { sets: next, removed } = changeType(sets, 1, 'REGULAR');
    expect(numbers(next)).toEqual(['1', '2', '3']);
    expect(removed).toHaveLength(2);
  });

  it('retypes attached sets when switching technique', () => {
    const { sets: next } = changeType(sets, 1, 'MYO_REP');
    expect(next.slice(1, 4).map((s) => s.setType)).toEqual(['MYO_REP', 'MYO_REP', 'MYO_REP']);
    expect(numbers(next)).toEqual(numbers(sets));
  });

  it('adds attached sets at the end of the group', () => {
    expect(numbers(addAttached(sets, 1, 'DROP_SET'))).toEqual(['1', '2', '2.1', '2.2', '2.3', '3']);
  });

  it('labels badges by technique', () => {
    expect(badgeLabel(main(3))).toBe('3');
    expect(badgeLabel(sub(2, 1))).toBe('D1');
    expect(badgeLabel(sub(2, 2, { setType: 'REST_PAUSE' }))).toBe('+2');
    expect(badgeLabel(sub(2, 1, { setType: undefined }), 'MYO_REP')).toBe('M1');
  });

  it('lists saved sets whose numbers changed', () => {
    const before = [main(1, { id: 10 }), main(2, { id: 11 }), main(3, { id: 12 })];
    const after = deleteSet(before, 0).sets;
    expect(renumberedSaved(before, after).map((s) => s.id)).toEqual([11, 12]);
  });

  it('counts main sets only', () => {
    expect(mainSetProgress([main(1, { completed: true }), sub(1, 1, { completed: true }), main(2)])).toEqual({ done: 1, total: 2 });
  });
});
