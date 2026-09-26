// Name matching for exercise search and duplicate detection.

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function words(s: string): string[] {
  return normalize(s).split(' ').filter(Boolean);
}

/** True when every word of the query appears in the name, case-insensitively. */
export function matchesQuery(name: string, query: string): boolean {
  const q = words(query);
  if (q.length === 0) return true;
  const n = normalize(name);
  return q.every((w) => n.includes(w));
}

export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Edit distance divided by the longer string's length: 0 is identical, 1 is nothing shared. */
export function normalizedDistance(a: string, b: string): number {
  const x = normalize(a);
  const y = normalize(b);
  const longest = Math.max(x.length, y.length);
  return longest === 0 ? 0 : editDistance(x, y) / longest;
}

export const DUPLICATE_DISTANCE = 0.3;

/**
 * Library entries that look like the name being typed: every word of the
 * query is in the name, or the normalised edit distance is at most 0.3.
 * Plural "s" endings are ignored when comparing words.
 */
export function nearDuplicates<T extends { name: string }>(query: string, items: T[], limit = 3): T[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const stem = (w: string) => w.replace(/s$/, '');
  const qWords = words(query).map(stem);
  return items
    .map((item) => {
      const nameWords = words(item.name).map(stem);
      const allWords = qWords.every((w) => nameWords.some((nw) => nw.includes(w)));
      const dist = normalizedDistance(query, item.name);
      return { item, score: allWords ? 0 : dist, match: allWords || dist <= DUPLICATE_DISTANCE };
    })
    .filter((r) => r.match)
    .sort((a, b) => a.score - b.score || a.item.name.length - b.item.name.length)
    .slice(0, limit)
    .map((r) => r.item);
}
