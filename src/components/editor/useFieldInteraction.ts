import { useState, useEffect } from 'react';
import type { FieldDef, PageMeta } from '../../types';
import { pdfToWeb } from '../../utils/coordinateMapper';
import { useEditorStore } from '../../store/useEditorStore';

export function useFieldInteraction(
  pageFields: FieldDef[],
  pageMeta: PageMeta,
  canvasWidth: number,
  canvasHeight: number,
  overlayRef: React.RefObject<HTMLDivElement | null>
) {
  const { 
    activeTool, 
    appMode, 
    selectedFieldIds, 
    selectField, 
    clearSelection 
  } = useEditorStore();
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  useEffect(() => {
    const parent = overlayRef.current?.parentElement;
    if (!parent) return;

    const handleParentPointerDown = (e: PointerEvent) => {
      if (appMode !== 'edit' || activeTool !== 'select') return;
      
      // If clicking on a field (pointer-events-auto), don't start marquee unless shift is held
      const target = e.target as HTMLElement;
      const isField = target.closest('.pointer-events-auto');
      
      if (isField && !e.shiftKey) return;

      // Prevent browser's native drag/text-selection from intercepting pointer events
      e.preventDefault();

      const rect = overlayRef.current!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
    };

    parent.addEventListener('pointerdown', handleParentPointerDown);
    return () => {
      parent.removeEventListener('pointerdown', handleParentPointerDown);
    };
  }, [appMode, activeTool, overlayRef]);

  useEffect(() => {
    if (!marquee) return;

    const handleWindowPointerMove = (e: PointerEvent) => {
      if (activeTool !== 'select' || appMode !== 'edit') return;
      const rect = overlayRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMarquee((prev) => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null);
    };

    const handleWindowPointerUp = (e: PointerEvent) => {
      if (appMode !== 'edit') return;
      if (activeTool !== 'select') {
        clearSelection();
        return;
      }
      
      if (marquee) {
        const minX = Math.min(marquee.startX, marquee.currentX);
        const maxX = Math.max(marquee.startX, marquee.currentX);
        const minY = Math.min(marquee.startY, marquee.currentY);
        const maxY = Math.max(marquee.startY, marquee.currentY);

        if (maxX - minX < 5 && maxY - minY < 5) {
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            clearSelection();
          }
        } else {
          // If a marquee selection actually happened (dragged > 5px), stop propagation
          // so that the background field doesn't trigger a 'click' and toggle itself off
          e.stopPropagation();

          const selectedIds: string[] = [];
          pageFields.forEach((f) => {
            const { webX, webY } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
            const webW = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
            const webH = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;

            if (
              webX < maxX &&
              webX + webW > minX &&
              webY < maxY &&
              webY + webH > minY
            ) {
              selectedIds.push(f.id);
            }
          });

          if (e.ctrlKey || e.metaKey || e.shiftKey) {
            selectedIds.forEach((id) => {
              if (!selectedFieldIds.includes(id)) {
                selectField(id, true);
              }
            });
          } else {
            clearSelection();
            selectedIds.forEach((id, index) => {
              selectField(id, index > 0);
            });
          }
        }
        setMarquee(null);
      }
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
    };
  }, [marquee, activeTool, appMode, overlayRef, pageFields, pageMeta, canvasWidth, canvasHeight, clearSelection, selectedFieldIds, selectField]);

  return {
    marquee
  };
}
