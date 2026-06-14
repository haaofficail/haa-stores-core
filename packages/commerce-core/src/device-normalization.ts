export interface NormalizedDevice {
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  os: 'iOS' | 'Android' | 'macOS' | 'Windows' | 'unknown';
  browser: 'Safari' | 'Chrome' | 'Edge' | 'Samsung Internet' | 'unknown';
  screenSize: 'small' | 'medium' | 'large';
}

const MOBILE_PATTERN = /Mobile|Android|iPhone|iP(?:od|hone)|IEMobile|WPDesktop/i;
const TABLET_PATTERN = /iPad|Android(?!.*Mobile)|Tablet|Silk/i;

const IOS_PATTERN = /iPad|iPhone|iPod/i;
const ANDROID_PATTERN = /Android/i;
const MACOS_PATTERN = /Macintosh|Mac OS X/i;
const WINDOWS_PATTERN = /Windows NT|Win64|WOW64/i;

const SAFARI_PATTERN = /^((?!Chrome|Chromium).)*Safari/i;
const CHROME_PATTERN = /Chrome|Chromium/i;
const EDGE_PATTERN = /Edg\/|Edge\//i;
const SAMSUNG_PATTERN = /SamsungBrowser/i;

export function normalizeDevice(userAgent: string | null): NormalizedDevice {
  const ua = userAgent ?? '';

  let deviceType: NormalizedDevice['deviceType'] = 'unknown';
  if (TABLET_PATTERN.test(ua)) deviceType = 'tablet';
  else if (MOBILE_PATTERN.test(ua)) deviceType = 'mobile';
  else deviceType = 'desktop';

  let os: NormalizedDevice['os'] = 'unknown';
  if (IOS_PATTERN.test(ua)) os = 'iOS';
  else if (ANDROID_PATTERN.test(ua)) os = 'Android';
  else if (MACOS_PATTERN.test(ua)) os = 'macOS';
  else if (WINDOWS_PATTERN.test(ua)) os = 'Windows';

  let browser: NormalizedDevice['browser'] = 'unknown';
  if (SAMSUNG_PATTERN.test(ua)) browser = 'Samsung Internet';
  else if (EDGE_PATTERN.test(ua)) browser = 'Edge';
  else if (CHROME_PATTERN.test(ua)) browser = 'Chrome';
  else if (SAFARI_PATTERN.test(ua)) browser = 'Safari';

  let screenSize: NormalizedDevice['screenSize'] = 'medium';
  if (deviceType === 'mobile') screenSize = 'small';

  return { deviceType, os, browser, screenSize };
}
