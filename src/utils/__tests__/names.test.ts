import { isDefaultDayName, workoutDisplayName } from '../names';

describe('workoutDisplayName', () => {
  it('keeps real names', () => {
    expect(workoutDisplayName('Push', ['CHEST'])).toBe('Push');
  });

  it('replaces default day names with the main muscles', () => {
    expect(isDefaultDayName('PPL - Day 3')).toBe(true);
    expect(workoutDisplayName('PPL - Day 3', ['CHEST', 'TRICEPS', 'CHEST', 'SHOULDERS'])).toBe('Chest & Triceps');
  });

  it('falls back to the day number', () => {
    expect(workoutDisplayName('PPL - Day 3', [])).toBe('Day 3');
    expect(workoutDisplayName(null, [], 2)).toBe('Day 2');
  });
});
