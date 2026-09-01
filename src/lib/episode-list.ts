export const DEFAULT_EPISODE_LIST_LIMIT = 20;

export interface EpisodeListWindowOptions {
  hasSearch: boolean;
  showAll: boolean;
  limit?: number;
}

/**
 * Selects the sidebar items while preserving the canonical order supplied by
 * the caller. The compact view starts at the current item and never wraps.
 */
export function getEpisodeListWindow<T>(
  items: readonly T[],
  currentItem: T | null | undefined,
  {
    hasSearch,
    showAll,
    limit = DEFAULT_EPISODE_LIST_LIMIT,
  }: EpisodeListWindowOptions,
): readonly T[] {
  if (hasSearch || showAll) return items;

  const currentIndex = currentItem == null ? -1 : items.indexOf(currentItem);
  const startIndex = currentIndex >= 0 ? currentIndex : 0;
  const windowSize = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : items.length;

  return items.slice(startIndex, startIndex + windowSize);
}
