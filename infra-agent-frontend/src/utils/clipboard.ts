/**
 * Shared clipboard utility with modern API fallback.
 *
 * Tries `navigator.clipboard.writeText` first, then falls back to a
 * hidden textarea + `execCommand('copy')` for older browsers.
 *
 * Partial pull-forward ahead of Phase 13 (`utils/persistenceManager.ts`
 * et al.) — this single function is a hard dependency of Phase 8's
 * `QueryTrace/blocks/BlockFrame.tsx` copy-to-clipboard control. Reconcile
 * with Phase 13's full utils sweep instead of keeping two copies.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text.trim()) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy path.
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
