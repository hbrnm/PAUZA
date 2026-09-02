export function hapticTap(style: 'light' | 'medium' = 'light'): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(style === 'light' ? 10 : 18);
  }
}
