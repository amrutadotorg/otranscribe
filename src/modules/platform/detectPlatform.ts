/**
 * detectPlatform.ts — Platform detection for keyboard shortcut display
 *
 * Returns the correct modifier key label (⌘ on Mac, Ctrl on others)
 * and formats shortcut strings for display.
 */

function isMac(): boolean {
  return (
    navigator.platform.includes('Mac') ||
    navigator.userAgent.includes('Mac') ||
    navigator.userAgent.includes('iPhone') ||
    navigator.userAgent.includes('iPad')
  );
}

export function modKey(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

/**
 * Replace 'mod' in a shortcut string with the platform-appropriate symbol.
 * e.g. 'mod+s' → '⌘+S' on Mac, 'Ctrl+S' on other platforms
 */
export function formatShortcutDisplay(shortcut: string): string {
  const mod = modKey();
  return shortcut
    .split('+')
    .map((part, i) => {
      if (part.toLowerCase() === 'mod') return mod;
      if (i > 0 && part.toLowerCase() !== 'mod') return part.toUpperCase();
      return part;
    })
    .join('+');
}
