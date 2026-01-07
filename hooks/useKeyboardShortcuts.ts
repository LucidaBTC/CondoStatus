'use client';

import { useEffect, useCallback } from 'react';

type KeyHandler = () => void;

interface ShortcutMap {
  [key: string]: KeyHandler;
}

/**
 * Hook for handling keyboard shortcuts
 * 
 * Usage:
 * useKeyboardShortcuts({
 *   'ctrl+s': () => handleSave(),
 *   'ctrl+k': () => openSearch(),
 *   'escape': () => closeModal(),
 * });
 */
export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') {
        return;
      }
    }

    // Build key combination string
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    parts.push(event.key.toLowerCase());
    
    const combination = parts.join('+');

    // Check if we have a handler for this combination
    const handler = shortcuts[combination] || shortcuts[event.key.toLowerCase()];
    
    if (handler) {
      event.preventDefault();
      handler();
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Common shortcuts that can be reused
 */
export const COMMON_SHORTCUTS = {
  SAVE: 'ctrl+s',
  SEARCH: 'ctrl+k',
  CLOSE: 'escape',
  NEW: 'ctrl+n',
  HELP: 'ctrl+/',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+shift+z',
} as const;

/**
 * Hook for a single shortcut
 */
export function useShortcut(key: string, handler: KeyHandler) {
  useKeyboardShortcuts({ [key]: handler });
}

/**
 * Component to display available keyboard shortcuts
 */
export function KeyboardShortcutsHelp({ shortcuts }: { shortcuts: { key: string; description: string }[] }) {
  return (
    <div className="space-y-2">
      {shortcuts.map(({ key, description }) => (
        <div key={key} className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{description}</span>
          <kbd className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono">
            {key}
          </kbd>
        </div>
      ))}
    </div>
  );
}
