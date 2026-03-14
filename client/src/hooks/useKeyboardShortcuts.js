import { useEffect, useCallback } from 'react';

const SHORTCUTS = [
  { key: '/', description: 'Search boards & cards', action: 'search' },
  { key: 'n', description: 'New card (on board)', action: 'new-card' },
  { key: 'a', description: 'Toggle activity panel', action: 'toggle-activity' },
  { key: 'c', description: 'Toggle chat panel', action: 'toggle-chat' },
  { key: 'Ctrl+Z', description: 'Undo last action', action: 'undo' },
  { key: 'Ctrl+Shift+Z', description: 'Redo last action', action: 'redo' },
  { key: '?', description: 'Show keyboard shortcuts', action: 'show-help' },
  { key: 'Escape', description: 'Close modal / panel', action: 'close' },
];

export { SHORTCUTS };

export function useKeyboardShortcuts(handlers = {}) {
  const handleKeyDown = useCallback(
    (e) => {
      // Handle Ctrl/Cmd shortcuts first (these work even in inputs)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handlers.undo?.();
          return;
        }
        if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
          e.preventDefault();
          handlers.redo?.();
          return;
        }
        return;
      }

      // Don't trigger letter shortcuts when typing in inputs
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        if (e.key === 'Escape' && handlers.close) {
          e.target.blur();
          handlers.close();
        }
        return;
      }

      if (e.altKey) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          handlers.search?.();
          break;
        case 'n':
          handlers['new-card']?.();
          break;
        case 'a':
          handlers['toggle-activity']?.();
          break;
        case 'c':
          handlers['toggle-chat']?.();
          break;
        case '?':
          e.preventDefault();
          handlers['show-help']?.();
          break;
        case 'Escape':
          handlers.close?.();
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
