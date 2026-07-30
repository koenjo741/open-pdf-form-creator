import React from 'react';
import type { FieldDef, PageMeta } from '../../types';
import { pdfToWeb } from '../../utils/coordinateMapper';
import { useEditorStore } from '../../store/useEditorStore';

interface LaserBeamsProps {
  pageFields: FieldDef[];
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
  globalDrag: { originId: string; dxWeb: number; dyWeb: number } | null;
  globalResize: { originId: string; handle: string; rx: number; ry: number; rw: number; rh: number } | null;
}

export function LaserBeams({ pageFields, pageMeta, canvasWidth, canvasHeight, globalDrag, globalResize }: LaserBeamsProps) {
  const { selectedFieldIds, appMode } = useEditorStore();

  if (appMode !== 'edit') return null;

  return (
    <>
      {selectedFieldIds.map(id => {
        const f = pageFields.find(pf => pf.id === id);
        if (!f || (f.type !== 'text' && f.type !== 'date')) return null;

        let { webY } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
        let webH = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;

        if (globalDrag && (globalDrag.originId === f.id || selectedFieldIds.includes(f.id))) {
           webY += globalDrag.dyWeb;
        }
        if (globalResize && (globalResize.originId === f.id || selectedFieldIds.includes(f.id))) {
           webY += globalResize.ry;
           webH += globalResize.rh;
        }

        const scaledFontSize = (f.fontSize || 12) * (canvasHeight / pageMeta.heightPt);
        const baselineY = webY + (webH / 2) + scaledFontSize * 0.35;

        return (
          <div
            key={`laser-${id}`}
            className="absolute left-0 right-0 border-t-[0.5px] border-solid border-red-500/80 z-40 pointer-events-none"
            style={{ top: baselineY }}
          />
        );
      })}
    </>
  );
}
