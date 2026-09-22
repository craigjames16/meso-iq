import { ResourceCache, resetAllCaches } from '../cache';

describe('ResourceCache', () => {
  it('empties every cache on reset', async () => {
    const a = new ResourceCache<string[]>();
    const b = new ResourceCache<number>();
    await a.load('plans', async () => ['Old user plan']);
    await b.load('count', async () => 3);
    resetAllCaches();
    expect(a.has('plans')).toBe(false);
    expect(b.has('count')).toBe(false);
  });

  it('drops a response that was in flight when the user changed', async () => {
    const cache = new ResourceCache<string>();
    let finish!: (v: string) => void;
    const oldRequest = cache.load('plans', () => new Promise<string>((r) => (finish = r)));
    resetAllCaches();
    finish('old user');
    await expect(oldRequest).resolves.toBe('old user');
    expect(cache.has('plans')).toBe(false);
    await expect(cache.load('plans', async () => 'new user')).resolves.toBe('new user');
    expect(cache.get('plans')).toBe('new user');
  });
});
