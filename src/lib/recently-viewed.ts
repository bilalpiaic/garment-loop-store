/** Client-side recently viewed products (localStorage, max 8). */

export const RECENTLY_VIEWED_KEY = "garmentloop-recently-viewed";
export const RECENTLY_VIEWED_MAX = 8;

export type RecentlyViewedItem = {
  id: string;
  slug: string;
  title: string;
  image: string;
  viewedAt: number;
};

export function readRecentlyViewed(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row): row is RecentlyViewedItem => {
        if (!row || typeof row !== "object") return false;
        const item = row as Record<string, unknown>;
        return (
          typeof item.id === "string" &&
          typeof item.slug === "string" &&
          typeof item.title === "string" &&
          typeof item.image === "string"
        );
      })
      .map((item) => ({
        ...item,
        viewedAt: typeof item.viewedAt === "number" ? item.viewedAt : 0,
      }))
      .slice(0, RECENTLY_VIEWED_MAX);
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(input: {
  id: string;
  slug: string;
  title: string;
  image: string;
}): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  const next: RecentlyViewedItem = {
    id: input.id,
    slug: input.slug,
    title: input.title,
    image: input.image,
    viewedAt: Date.now(),
  };
  const existing = readRecentlyViewed().filter((item) => item.id !== input.id);
  const items = [next, ...existing].slice(0, RECENTLY_VIEWED_MAX);
  try {
    window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("garmentloop-recently-viewed"));
  } catch {
    // Quota / private mode — ignore.
  }
  return items;
}

export function recentlyViewedIds(): string[] {
  return readRecentlyViewed().map((item) => item.id);
}

/** Soft boost: products whose ids appear in recently viewed float toward the front. */
export function boostByRecentlyViewed<T extends { id: string }>(
  products: T[],
  recentIds: string[],
): T[] {
  if (recentIds.length === 0) return products;
  const rank = new Map(recentIds.map((id, index) => [id, index]));
  return [...products].sort((a, b) => {
    const aRank = rank.has(a.id) ? (rank.get(a.id) as number) : Number.POSITIVE_INFINITY;
    const bRank = rank.has(b.id) ? (rank.get(b.id) as number) : Number.POSITIVE_INFINITY;
    if (aRank !== bRank) return aRank - bRank;
    return 0;
  });
}
