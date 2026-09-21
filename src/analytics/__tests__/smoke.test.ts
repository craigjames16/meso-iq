describe('analytics test harness', () => {
  it('runs plain TypeScript tests', () => {
    const add = (a: number, b: number): number => a + b;
    expect(add(2, 3)).toBe(5);
  });
});
