import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number | string, options?: Intl.NumberFormatOptions): string {
  return Number(n).toLocaleString('en-US', options);
}

export function formatCurrency(n: number | string): string {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const FALLBACK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f5f5f4"/><g transform="translate(60,50)"><path d="M60 50H20a5 5 0 0 0-5 5v40a5 5 0 0 0 5 5h40a5 5 0 0 0 5-5V55a5 5 0 0 0-5-5zm-30 5l10 13 7-7 13 16H25z" fill="#d4d4d4"/><circle cx="58" cy="58" r="5" fill="#d4d4d4"/></g></svg>`;
const FALLBACK_DATA_URI = `data:image/svg+xml;base64,${btoa(FALLBACK_SVG)}`;

export function getDefaultImage(): string {
  return FALLBACK_DATA_URI;
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  img.onerror = null;
  img.src = getDefaultImage();
}
