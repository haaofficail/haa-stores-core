import { type ThemeColors } from './types';

export function generateThemeThumbnail(colors: ThemeColors): string {
  const { primary, surface1, surface2, surface3, textPrimary, textSecondary } = colors;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450">
  <defs>
    <linearGradient id="h" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${surface2}"/>
      <stop offset="100%" stop-color="${surface3}"/>
    </linearGradient>
  </defs>
  <rect width="600" height="450" fill="${surface1}" rx="12"/>
  <!-- Header -->
  <rect x="0" y="0" width="600" height="48" fill="${surface2}" rx="0"/>
  <rect x="16" y="12" width="80" height="24" fill="${primary}" rx="6"/>
  <rect x="520" y="14" width="20" height="20" fill="${surface3}" rx="10"/>
  <rect x="550" y="14" width="20" height="20" fill="${primary}" rx="10"/>
  <!-- Hero -->
  <rect x="16" y="64" width="568" height="140" fill="url(#h)" rx="12"/>
  <rect x="32" y="80" width="140" height="16" fill="${textPrimary}" opacity="0.4" rx="4"/>
  <rect x="32" y="104" width="200" height="12" fill="${textSecondary}" opacity="0.3" rx="4"/>
  <rect x="32" y="164" width="100" height="28" fill="${primary}" rx="8"/>
  <!-- Products -->
  <rect x="16" y="224" width="180" height="210" fill="${surface2}" rx="12"/>
  <rect x="16" y="224" width="180" height="140" fill="${surface3}" rx="12" ry="12"/>
  <rect x="24" y="376" width="100" height="10" fill="${textSecondary}" opacity="0.3" rx="3"/>
  <rect x="24" y="394" width="60" height="10" fill="${primary}" rx="3"/>
  <rect x="210" y="224" width="180" height="210" fill="${surface2}" rx="12"/>
  <rect x="210" y="224" width="180" height="140" fill="${surface3}" rx="12" ry="12"/>
  <rect x="218" y="376" width="100" height="10" fill="${textSecondary}" opacity="0.3" rx="3"/>
  <rect x="218" y="394" width="60" height="10" fill="${primary}" rx="3"/>
  <rect x="404" y="224" width="180" height="210" fill="${surface2}" rx="12"/>
  <rect x="404" y="224" width="180" height="140" fill="${surface3}" rx="12" ry="12"/>
  <rect x="412" y="376" width="100" height="10" fill="${textSecondary}" opacity="0.3" rx="3"/>
  <rect x="412" y="394" width="60" height="10" fill="${primary}" rx="3"/>
</svg>`;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
