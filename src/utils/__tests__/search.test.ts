import { matchesQuery, nearDuplicates, normalizedDistance } from '../search';

const lib = [
  { name: 'Barbell Bent Over Rows' },
  { name: 'Bent Over Rows' },
  { name: 'Leg Press' },
  { name: 'Seated Leg Curls' },
];

describe('search', () => {
  it('matches any word in the name, case-insensitively', () => {
    expect(matchesQuery('Seated Leg Curls', 'curl')).toBe(true);
    expect(matchesQuery('Seated Leg Curls', 'LEG seated')).toBe(true);
    expect(matchesQuery('Seated Leg Curls', 'press')).toBe(false);
    expect(matchesQuery('Anything', '  ')).toBe(true);
  });

  it('finds near-duplicates by words or edit distance', () => {
    expect(nearDuplicates('Bent over rows', lib).map((e) => e.name)).toEqual(['Bent Over Rows', 'Barbell Bent Over Rows']);
    expect(nearDuplicates('Leg Pres', lib).map((e) => e.name)).toContain('Leg Press');
    expect(nearDuplicates('Lat pulldown', lib)).toEqual([]);
  });

  it('normalises edit distance by length', () => {
    expect(normalizedDistance('abc', 'abc')).toBe(0);
    expect(normalizedDistance('abcd', 'abcx')).toBe(0.25);
  });
});
