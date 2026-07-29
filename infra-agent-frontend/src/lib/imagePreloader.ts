import { AVATAR_SET_1, AVATAR_SET_2, getAvatarSet } from "./avatars";

const preloadedImages = new Set<string>();

/**
 * Preload a single image via a `<link rel="preload">` tag. Deduplicates so
 * the same URL is never appended twice.
 */
export function preloadImage(src: string): void {
  if (preloadedImages.has(src)) return;

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  if (src.endsWith(".webp")) link.type = "image/webp";

  document.head.appendChild(link);
  preloadedImages.add(src);
}

/**
 * Preloads every avatar in the currently active set (1 or 2) so Workflow
 * Designer canvas agent cards render their avatar instantly the moment an
 * agent is added, instead of waiting on a first-paint image fetch.
 *
 * Ported as-is from the Vite app's `lib/imagePreloader.ts` — unlike
 * `NavigationLoader` (superseded by Next's own `loading.tsx` convention),
 * Next has no built-in equivalent for proactively preloading a whole named
 * asset set ahead of it being rendered, so this still earns its keep.
 */
export function preloadAllAvatars(): void {
  const activeSet = getAvatarSet() === 2 ? AVATAR_SET_2 : AVATAR_SET_1;

  const uniquePaths = new Set(Object.values(activeSet));
  uniquePaths.forEach((path) => {
    try {
      preloadImage(path);
    } catch {
      // Swallow -- non-critical
    }
  });
}

export function isImagePreloaded(src: string): boolean {
  return preloadedImages.has(src);
}
