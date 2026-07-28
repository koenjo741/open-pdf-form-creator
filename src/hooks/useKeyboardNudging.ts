import { useEffect } from 'react';
import { useEditorStore } from '../store/useEditorStore';

export function useKeyboardNudging(pageIndex: number) {
  const { fields, selectedFieldIds, activeTool, appMode, updateFields } = useEditorStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't nudge if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (selectedFieldIds.length === 0 || activeTool !== 'select' || appMode !== 'edit') return;

      const selectedFieldsOnPage = fields.filter(
        (f) => selectedFieldIds.includes(f.id) && f.pageIndex === pageIndex
      );
      if (selectedFieldsOnPage.length === 0) return;

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case 'ArrowUp':
          dy = step;
          break;
        case 'ArrowDown':
          dy = -step;
          break;
        case 'ArrowLeft':
          dx = -step;
          break;
        case 'ArrowRight':
          dx = step;
          break;
        default:
          return; // Ignore other keys
      }

      e.preventDefault(); // Prevent scrolling
      const updates = selectedFieldsOnPage.map((field) => ({
        id: field.id,
        patch: {
          pdfX: field.pdfX + dx,
          pdfY: field.pdfY + dy,
        },
      }));
      updateFields(updates);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldIds, fields, activeTool, pageIndex, updateFields, appMode]);
}
