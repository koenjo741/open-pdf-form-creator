import { useState, useCallback } from 'react';
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== 'select' || appMode !== 'edit') return;
      if (e.target !== overlayRef.current) return;
      
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
    },
    [activeTool, appMode, overlayRef]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!marquee || activeTool !== 'select' || appMode !== 'edit') return;
      const rect = overlayRef.current!.getBoundingClientRect();
      setMarquee((prev) => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null);
    },
    [marquee, activeTool, appMode, overlayRef]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
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
    },
    [activeTool, marquee, pageFields, pageMeta, canvasWidth, canvasHeight, clearSelection, selectedFieldIds, selectField, appMode]
  );

  return {
    marquee,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
