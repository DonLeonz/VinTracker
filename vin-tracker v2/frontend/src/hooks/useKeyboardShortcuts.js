import { useEffect, useRef } from 'react';

function isTypingInInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
}

/**
 * Registers global keyboard shortcuts.
 * @param {Array<{ key: string, alt?: boolean, ctrl?: boolean, shift?: boolean, allowInInput?: boolean, action: Function }>} shortcuts
 */
export function useKeyboardShortcuts(shortcuts) {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    const handler = (e) => {
      for (const shortcut of shortcutsRef.current) {
        const {
          key,
          alt = false,
          ctrl = false,
          shift = false,
          allowInInput = false,
          action,
        } = shortcut;

        if (e.key !== key) continue;
        if (alt !== e.altKey) continue;
        if (ctrl !== e.ctrlKey) continue;
        if (shift !== e.shiftKey) continue;
        if (!allowInInput && isTypingInInput()) continue;

        e.preventDefault();
        action(e);
        break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
