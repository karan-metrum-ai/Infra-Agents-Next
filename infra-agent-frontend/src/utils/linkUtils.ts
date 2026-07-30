/**
 * Helpers for rendering safe, clickable links in trace content.
 *
 * Partial pull-forward ahead of Phase 13 (`utils/linkUtils.ts(+test)` is
 * on that phase's file list) — these three pure functions are a hard
 * dependency of Phase 8's `MarkdownRenderer.tsx` and `blocks/TableBlock.tsx`.
 * Reconcile with Phase 13's full utils sweep instead of keeping two copies.
 */

const ABSOLUTE_URL_RE = /^https?:\/\//i;

const LOCALHOST_URL_RE = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/.*)$/i;

const RELATIVE_PATH_RE = /^\/[^\s"'<>]+$/;

const DOWNLOAD_FILE_RE = /\.(?:pdf|csv|xlsx?|json|zip|tar|gz|txt)(?:\?[^\s]*)?$/i;

const REPORT_PATH_RE = /^\/(?:clusterid-\d+|team-[a-f0-9-]+)?\/?reports\//i;

/** Rewrites localhost absolute URLs to same-origin relative paths. */
export function normalizeLinkHref(href: string): string {
  const trimmed = href.trim();
  const localhostMatch = trimmed.match(LOCALHOST_URL_RE);
  if (localhostMatch) {
    return localhostMatch[1];
  }
  return trimmed;
}

/** Returns true when a href can be rendered as a clickable anchor. */
export function isSafeLinkHref(href: string | undefined | null): boolean {
  if (!href) {
    return false;
  }

  const normalized = normalizeLinkHref(href);

  if (ABSOLUTE_URL_RE.test(normalized)) {
    return true;
  }

  if (!RELATIVE_PATH_RE.test(normalized)) {
    return false;
  }

  if (normalized.includes("..")) {
    return false;
  }

  return (
    DOWNLOAD_FILE_RE.test(normalized) ||
    REPORT_PATH_RE.test(normalized) ||
    normalized.startsWith("/reports/")
  );
}

/** Chooses a short label for a link target. */
export function getLinkDisplayText(href: string, linkText?: string): string {
  const normalizedText = (linkText ?? "").trim();
  const normalizedHref = normalizeLinkHref(href);
  const lowerText = normalizedText.toLowerCase();

  if (
    normalizedText &&
    lowerText !== "link" &&
    lowerText !== "url" &&
    !/^https?:\/\//i.test(normalizedText)
  ) {
    return normalizedText;
  }

  const fileName = normalizedHref.split("/").pop()?.split("?")[0];
  if (fileName && DOWNLOAD_FILE_RE.test(normalizedHref)) {
    return fileName;
  }

  if (/^https?:\/\//i.test(normalizedText)) {
    return "Link";
  }

  return normalizedText || "Download";
}
