import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export function useUndoRedoShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger undo/redo if the user is typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      // Check for Ctrl or Meta (Command on Mac)
      const isMac = navigator.userAgent.toLowerCase().includes('mac');
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      const key = e.key.toLowerCase();
      const temporal = useEditorStore.temporal.getState();

      if (key === 'z') {
        if (e.shiftKey) {
          // Ctrl+Shift+Z -> Redo
          if (temporal.futureStates.length > 0) {
            e.preventDefault();
            temporal.redo();
          }
        } else {
          // Ctrl+Z -> Undo
          if (temporal.pastStates.length > 0) {
            e.preventDefault();
            temporal.undo();
          }
        }
      } else if (key === 'y') {
        // Ctrl+Y -> Redo
        if (temporal.futureStates.length > 0) {
          e.preventDefault();
          temporal.redo();
        }
      } else if (key === 'c' && !e.shiftKey) {
        // Ctrl+C -> Open Field Action Modal
        const state = useEditorStore.getState();
        if (state.selectedFieldIds.length === 1) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('OPEN_FIELD_ACTIONS', { detail: { fieldId: state.selectedFieldIds[0] } })
          );
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
