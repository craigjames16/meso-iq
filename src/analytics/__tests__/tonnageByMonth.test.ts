import { tonnageByMonth } from '../volume';
import { at, session, set } from '../__fixtures__/build';

describe('tonnageByMonth', () => {
  const sessions = [
    session(at(2026, 3, 10), [set(1, 100, 10)]),
    session(at(2026, 4, 10), [set(1, 100, 20)]),
    session(at(2026, 5, 10), [set(1, 100, 30)]),
    session(at(2026, 6, 10), [set(1, 100, 10)]),
  ];

  it('leaves avg3 null for the first two months with data', () => {
    const months = tonnageByMonth(sessions, 2026, new Date(2026, 5, 20));
    expect(months.map((m) => m.avg3)).toEqual([null, null, null, null, 2000, 2000]);
    expect(months[4].tonnage).toBe(3000);
  });

  it('marks the current month as partial and stops there', () => {
    const months = tonnageByMonth(sessions, 2026, new Date(2026, 5, 20));
    expect(months).toHaveLength(6);
    expect(months[5].partial).toBe(true);
    expect(months.filter((m) => m.partial)).toHaveLength(1);
  });

  it('returns all twelve months for a past year', () => {
    expect(tonnageByMonth(sessions, 2026, new Date(2027, 1, 1))).toHaveLength(12);
  });
});
