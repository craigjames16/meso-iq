import { nextMesocycleName, repRangeLabel, rirRamp } from '../program';

describe('program helpers', () => {
  it('matches the API RIR ramp', () => {
    expect(rirRamp(5).map((w) => w.rir)).toEqual([3, 3, 2, 1, 0]);
    expect(rirRamp(3).map((w) => w.rir)).toEqual([2, 1, 0]);
  });

  it('labels rep ranges', () => {
    expect(repRangeLabel(8, 12)).toBe('8–12');
    expect(repRangeLabel(10, 10)).toBe('10');
    expect(repRangeLabel(null, null)).toBeNull();
  });

  it('names the next mesocycle', () => {
    expect(nextMesocycleName([])).toBe('Meso 1');
    expect(nextMesocycleName([{ name: 'Meso 3' }, { name: 'Summer block' }])).toBe('Meso 4');
  });
});
