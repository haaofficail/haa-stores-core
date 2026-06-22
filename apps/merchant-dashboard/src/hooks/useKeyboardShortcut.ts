// useKeyboardShortcut — wires a single global keyboard shortcut to a
// callback. Matches both Cmd (macOS) and Ctrl (Windows/Linux). Listens
// at the document level + ignores presses fired while focus is in a
// text input so Cmd+K doesn't fire while the merchant is typing into a
// search box (the dialog will steal focus anyway).

import { useEffect } from 'react';

interface Options {
  key: string; // e.g. 'k'
  meta?: boolean; // require Cmd / Ctrl
  onTrigger: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({ key, meta = true, onTrigger, enabled = true }: Options): void {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      // Ignore if the user is typing into a contentEditable / textarea / input
      // that is not the shortcut's own dialog.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isText = tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable;
      if (isText) return;
      e.preventDefault();
      onTrigger();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, meta, onTrigger, enabled]);
}
