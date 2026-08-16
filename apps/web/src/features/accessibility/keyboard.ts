export type RovingTabDirection = 'ltr' | 'rtl';

export function getNextRovingTabId(
  enabledIds: readonly string[],
  currentId: string | undefined,
  key: string,
  direction: RovingTabDirection = 'ltr'
): string | undefined {
  if (enabledIds.length === 0) return undefined;
  if (key === 'Home') return enabledIds[0];
  if (key === 'End') return enabledIds.at(-1);
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return undefined;

  const currentIndex = Math.max(0, enabledIds.indexOf(currentId ?? ''));
  const directionMultiplier = direction === 'rtl' ? -1 : 1;
  const step = key === 'ArrowRight' ? directionMultiplier : -directionMultiplier;
  return enabledIds[(currentIndex + step + enabledIds.length) % enabledIds.length];
}

