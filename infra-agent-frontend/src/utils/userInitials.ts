/**
 * Derives display initials from a user's name or email.
 *
 * Pulled forward from its real Phase-13 home (`components/shared/**`'s
 * cross-cutting utilities) because `ProfileAvatar`/`InitialsAvatar` need it
 * and those are themselves pulled forward for Phase 6 (`CenterNavPanel`).
 */

/** True when the URL points at Auth0's generated avatar CDN. */
export function isAuth0AvatarUrl(url: string | undefined | null): boolean {
  if (!url) {
    return false;
  }
  return (
    /cdn\.auth0\.com\/avatars\//i.test(url) ||
    /\/auth0-avatars\//i.test(url) ||
    /wp\.com\/cdn\.auth0\.com\/avatars\//i.test(url)
  );
}

/** Use initials when there is no picture or it is an Auth0 default. */
export function shouldUseInitialsAvatar(picture: string | undefined | null): boolean {
  return !picture || isAuth0AvatarUrl(picture);
}

/**
 * First letter of the first name plus first letter of the last name.
 * Single name: first letter only. Falls back to email, then "U".
 */
export function getUserInitials(name?: string, email?: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email?.trim()) {
    return email.trim()[0].toUpperCase();
  }
  return "U";
}
