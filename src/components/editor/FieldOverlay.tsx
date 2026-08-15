import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { webToPdf, pdfToWeb, scaleToPdf } from '../../utils/coordinateMapper';
import type { FieldDef, PageMeta } from '../../types';
import { calculateSnaps, calculateResizeSnaps, type GuideLine, type Rect } from '../../utils/snapping';

import { PromptModal } from '../modals/PromptModal';
import { FieldActionModal } from '../modals/FieldActionModal';
import { useFieldContextMenu } from './fields/useFieldContextMenu';
import { useFieldInteraction } from './useFieldInteraction';
import { useKeyboardNudging } from '../../hooks/useKeyboardNudging';
import { createNewField } from '../../utils/fieldDefinitions';
import { LaserBeams } from './LaserBeams';
import { FieldBoxInner } from './fields/FieldBoxInner';
import { PreviewFieldBox } from './fields/PreviewFieldBox';

interface FieldOverlayProps {
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Absolute-positioned transparent overlay that:
 *  - Captures clicks to place new fields
 *  - Renders draggable/resizable FieldBox components for fields on this page
 */
export function FieldOverlay({ pageMeta, canvasWidth, canvasHeight }: FieldOverlayProps) {
  const { t } = useTranslation();
  const { fields, addField, selectField, activeTool, setActiveTool, selectedFieldIds, updateField, updateFields, clearSelection, appMode, snapToGrid } = useEditorStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const pageFields = fields.filter((f) => f.pageIndex === pageMeta.pageIndex);
  const isPlacingMode = activeTool !== 'select';

  const { contextMenu, setContextMenu, promptModal, setPromptModal, handleRename, handleDuplicate, handleClone, handleConvert } = useFieldContextMenu(fields, pageFields, addField, selectField, updateField);

  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);

  const [globalDrag, setGlobalDrag] = useState<{ originId: string; dxWeb: number; dyWeb: number } | null>(null);
  const [globalResize, setGlobalResize] = useState<{ originId: string; handle: string; rx: number; ry: number; rw: number; rh: number } | null>(null);

  useKeyboardNudging(pageMeta.pageIndex);

  useEffect(() => {
    const handleOpenActions = (e: Event) => {
      const customEvent = e as CustomEvent<{ fieldId: string }>;
      // Only open it if the field belongs to THIS page (so we don't open multiple modals)
      if (pageFields.find(f => f.id === customEvent.detail.fieldId)) {
        setContextMenu({ x: 0, y: 0, fieldId: customEvent.detail.fieldId });
      }
    };
    window.addEventListener('OPEN_FIELD_ACTIONS', handleOpenActions);
    return () => window.removeEventListener('OPEN_FIELD_ACTIONS', handleOpenActions);
  }, [pageFields, setContextMenu]);

  const { marquee } = useFieldInteraction(
    pageFields,
    pageMeta,
    canvasWidth,
    canvasHeight,
    overlayRef
  );

  const handlePointerDownWrapper = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (appMode !== 'edit') return;
      if (activeTool === 'select' || activeTool === 'freetext') return;
      
      // We are placing a new field
      if (e.target !== overlayRef.current) return;
      
      const rect = overlayRef.current.getBoundingClientRect();
      const webX = e.clientX - rect.left;
      const webY = e.clientY - rect.top;

      const { pdfX, pdfY } = webToPdf(
        webX, webY,
        pageMeta.widthPt, pageMeta.heightPt,
        canvasWidth, canvasHeight,
      );

      const newField = createNewField(activeTool, fields, pageMeta.pageIndex, pdfX, pdfY, t);
      
      addField(newField);
      selectField(newField.id);
      setActiveTool('select');
    },
    [appMode, activeTool, isPlacingMode, canvasWidth, canvasHeight, pageMeta, pageFields.length, addField, selectField, setActiveTool, t]
  );

  return (
    <div
      ref={overlayRef}
      onPointerDown={handlePointerDownWrapper}
      onDoubleClick={(e) => {
        if (appMode === 'edit' && activeTool === 'select') {
          setActiveTool('freetext');
        }
      }}
      className={`absolute inset-0 z-10 select-none overflow-hidden touch-none ${activeTool === 'freetext' ? 'pointer-events-none' : ''}`}
      style={{ cursor: appMode === 'edit' && isPlacingMode ? 'crosshair' : 'default', touchAction: 'none' }}
    >
      {/* Grid Overlay */}
      {snapToGrid && appMode === 'edit' && (
        <svg className="absolute inset-0 pointer-events-none z-0" width="100%" height="100%">
          <defs>
            <pattern 
              id={`grid-${pageMeta.pageIndex}`} 
              width={(10 / pageMeta.widthPt) * canvasWidth} 
              height={(10 / pageMeta.heightPt) * canvasHeight} 
              patternUnits="userSpaceOnUse"
            >
              <path 
                d={`M ${(10 / pageMeta.widthPt) * canvasWidth} 0 L 0 0 0 ${(10 / pageMeta.heightPt) * canvasHeight}`} 
                fill="none" 
                className="stroke-blue-500/20 dark:stroke-blue-400/18" 
                strokeWidth="1" 
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#grid-${pageMeta.pageIndex})`} />
        </svg>
      )}

      {/* Marquee Box */}
      {marquee && appMode === 'edit' && (
        <div
          className="absolute border border-blue-500 bg-blue-500/20 z-40 pointer-events-none"
          style={{
            left: Math.min(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
        />
      )}
      {/* Guide lines */}
      {activeGuides.map((guide, i) => (
        <div
          key={`guide-${i}`}
          className="absolute bg-blue-500 z-50 pointer-events-none"
          style={{
            ...(guide.type === 'vertical'
              ? { left: guide.position, top: 0, bottom: 0, width: 1 }
              : { top: guide.position, left: 0, right: 0, height: 1 }),
          }}
        />
      ))}

      {/* Laser Beams for selected text/date fields */}
      <LaserBeams
        pageFields={pageFields}
        pageMeta={pageMeta}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
        globalDrag={globalDrag}
        globalResize={globalResize}
      />

      {pageFields.map((field) => (
        appMode === 'preview' ? (
          <PreviewFieldBox
            key={field.id}
            field={field}
            pageMeta={pageMeta}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
          />
        ) : (
          <FieldBoxInner
            key={field.id}
            field={field}
            pageMeta={pageMeta}
            canvasWidth={canvasWidth}
            canvasHeight={canvasHeight}
            otherFields={pageFields.filter((f) => f.id !== field.id)}
            onGuidesChange={setActiveGuides}
            globalDrag={globalDrag}
            setGlobalDrag={setGlobalDrag}
            globalResize={globalResize}
            setGlobalResize={setGlobalResize}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = overlayRef.current!.getBoundingClientRect();
              setContextMenu({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                fieldId: field.id,
              });
            }}
          />
        )
      ))}

      {contextMenu && appMode === 'edit' && pageFields.find(f => f.id === contextMenu.fieldId) && (
        <FieldActionModal
          field={pageFields.find(f => f.id === contextMenu.fieldId)!}
          onClose={() => setContextMenu(null)}
          onRename={handleRename}
          onDuplicate={handleDuplicate}
          onClone={handleClone}
          onConvert={handleConvert}
        />
      )}

      {promptModal && (
        <PromptModal
          open={promptModal.open}
          title="Feldname umbenennen:"
          initialValue={promptModal.initialValue}
          onConfirm={(newName: string) => {
            if (newName && newName.trim() !== '') {
              updateField(promptModal.fieldId, { name: newName.trim(), label: newName.trim() });
            }
            setPromptModal(null);
          }}
          onCancel={() => setPromptModal(null)}
        />
      )}
    </div>
  );
}
