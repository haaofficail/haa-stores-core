// AiAssistant — abort/cancel contract.
//
// The chat handler previously had no AbortController, so the merchant
// could not stop a slow or runaway AI response — they had to wait for
// a network timeout or close the tab. Audit P0 #14 (2026-06-25).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const AI = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/pages/AiAssistant.tsx'),
  'utf-8',
);
const API = readFileSync(
  resolve(__dirname, '../apps/merchant-dashboard/src/lib/api.ts'),
  'utf-8',
);

describe('AiAssistant — cancellable chat', () => {
  it('aiApi.chat accepts an optional AbortSignal', () => {
    expect(API).toMatch(/chat:\s*\(\s*[\s\S]*?signal\?\:\s*AbortSignal[\s\S]*?\)/);
    // The signal is forwarded to the underlying request call.
    expect(API).toMatch(/signal,?\s*\}\)/);
  });

  it('AiAssistant tracks an AbortController in a ref', () => {
    expect(AI).toMatch(/chatAbortRef\s*=\s*useRef<AbortController \| null>\(null\)/);
  });

  it('handleChatSubmit creates a controller and passes its signal to aiApi.chat', () => {
    const fn = AI.slice(AI.indexOf('async function handleChatSubmit'));
    expect(fn).toMatch(/const\s+controller\s*=\s*new\s+AbortController\(\)/);
    expect(fn).toMatch(/aiApi\.chat\([^)]*controller\.signal/);
  });

  it('cancelInFlight aborts the controller and clears loading', () => {
    expect(AI).toMatch(/function\s+cancelInFlight\s*\(\)/);
    const fn = AI.slice(AI.indexOf('function cancelInFlight'));
    expect(fn).toMatch(/chatAbortRef\.current\.abort\(\)/);
    expect(fn).toMatch(/setLoading\(false\)/);
  });

  it('AbortError is swallowed (no error toast on user cancel)', () => {
    const catchBlock = AI.slice(AI.indexOf('catch (err: unknown)'));
    expect(catchBlock).toMatch(/AbortError/);
    // The conditional must guard the toast.error call.
    expect(catchBlock).toMatch(/if\s*\(name\s*!==\s*['"]AbortError['"][\s\S]*?\)\s*\{\s*toast\.error/);
  });

  it('the input area shows a Stop button while loading', () => {
    // Find the `{loading ? (` ternary in the JSX and confirm its
    // truthy branch wires onClick to cancelInFlight.
    const tIdx = AI.lastIndexOf('{loading ? (');
    expect(tIdx).toBeGreaterThan(0);
    const block = AI.slice(tIdx, tIdx + 800);
    expect(block).toMatch(/onClick=\{cancelInFlight\}/);
  });

  it('an unmount aborts any in-flight chat request', () => {
    // Without this, an in-flight request continues after the user
    // navigates away — wasting bandwidth and creating a leak.
    expect(AI).toMatch(/useEffect\(\(\)\s*=>\s*\{[\s\S]{0,200}return\s*\(\)\s*=>\s*\{[\s\S]{0,100}chatAbortRef\.current\?\.abort\(\)/);
  });
});
