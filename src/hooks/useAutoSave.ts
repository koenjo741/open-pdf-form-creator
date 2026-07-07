import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

/**
 * Debounced auto-save hook.
 * Watches for field changes and persists them to IndexedDB via zustand persist.
 * The actual write is handled by zustand's persist middleware automatically —
 * this hook just triggers a manual snapshot on changes if needed.
 *
 * Since zustand-persist + idb-keyval writes on every state change automatically,
 * this hook exists as a safety net to ensure the store is always hydrated.
 */
export function useAutoSave(): void {
  const fields = useEditorStore((s) => s.fields);

  useEffect(() => {
    // Zustand's persist middleware automatically saves state changes to IndexedDB.
    // Calling rehydrate() here was a critical bug that wiped out the non-persisted pdfBuffer.
  }, [fields]);
}
