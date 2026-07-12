import { motion } from 'framer-motion';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { webToPdf, pdfToWeb, scaleToPdf } from '../../utils/coordinateMapper';
import type { FieldDef, PageMeta } from '../../types';
import { calculateSnaps, calculateResizeSnaps, type GuideLine, type Rect } from '../../utils/snapping';

import { useTranslation } from 'react-i18next';
import { DateValidationModal } from '../modals/DateValidationModal';
import { TextValidationModal } from '../modals/TextValidationModal';
import { FieldActionModal } from '../modals/FieldActionModal';
import { ScribbleModal } from '../modals/ScribbleModal';
import { PromptModal } from '../modals/PromptModal';

// Default field dimensions in PDF points
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  text:     { w: 144, h: 24 },
  dropdown: { w: 144, h: 24 },
  date:     { w: 144, h: 24 },
  checkbox: { w: 16,  h: 16 },
  radio:    { w: 16,  h: 16 },
  signature:{ w: 144, h: 48 },
  scribble: { w: 144, h: 48 },
};

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
  const { fields, addField, selectField, activeTool, setActiveTool, selectedFieldIds, updateField, updateFields, clearSelection, appMode } = useEditorStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const pageFields = fields.filter((f) => f.pageIndex === pageMeta.pageIndex);
  const isPlacingMode = activeTool !== 'select';

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fieldId: string } | null>(null);
  const [promptModal, setPromptModal] = useState<{ open: boolean; fieldId: string; initialValue: string } | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

  const [globalDrag, setGlobalDrag] = useState<{ originId: string; dxWeb: number; dyWeb: number } | null>(null);
  const [globalResize, setGlobalResize] = useState<{ originId: string; handle: string; rx: number; ry: number; rw: number; rh: number } | null>(null);

  // Keyboard Nudging (Multiple Fields)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't nudge if typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;
      if (selectedFieldIds.length === 0 || activeTool !== 'select' || appMode !== 'edit') return;

      const selectedFieldsOnPage = fields.filter((f) => selectedFieldIds.includes(f.id) && f.pageIndex === pageMeta.pageIndex);
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
        }
      }));
      updateFields(updates);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldIds, fields, activeTool, pageMeta.pageIndex, updateField, updateFields, appMode]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRename = () => {
    if (!contextMenu) return;
    const currentField = pageFields.find(f => f.id === contextMenu.fieldId);
    if (currentField) {
      setPromptModal({ open: true, fieldId: contextMenu.fieldId, initialValue: currentField.name });
      setContextMenu(null);
    }
  };

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    if (sourceField.label.includes(' (nicht editierbar)')) {
      return handleClone();
    }

    let prefix = sourceField.name.split(' -- ')[0] || sourceField.type;
    // ensure prefix is capitalized if it was e.g. text
    prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);

    let counter = 1;
    let baseName = '';
    while (true) {
      baseName = `${prefix} -- ${counter}`;
      if (!fields.some(f => f.name === baseName)) break;
      counter++;
    }

    const id = crypto.randomUUID();
    const newField: FieldDef = {
      ...sourceField,
      id,
      name: baseName,
      label: baseName,
      pdfY: sourceField.pdfY - sourceField.pdfHeight - 10, // place 10pt below
    };
    addField(newField);
    selectField(id);
  };

  const handleClone = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    const id = crypto.randomUUID();
    const newField: FieldDef = {
      ...sourceField,
      id,
      // Name stays exactly the same so it acts as a mirror/clone
      label: sourceField.label.includes(' (nicht editierbar)') 
        ? sourceField.label 
        : `${sourceField.label} (nicht editierbar)`,
      pdfY: sourceField.pdfY - sourceField.pdfHeight - 10,
    };
    addField(newField);
    selectField(id);
  };

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (activeTool !== 'select' || appMode !== 'edit') return;
      // Only start marquee if clicking directly on the overlay, not on a field
      if (e.target !== overlayRef.current) return;
      
      const rect = overlayRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setMarquee({ startX: x, startY: x, currentX: x, currentY: y });
      setMarquee({ startX: x, startY: y, currentX: x, currentY: y });
    },
    [activeTool, appMode]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!marquee || activeTool !== 'select' || appMode !== 'edit') return;
      const rect = overlayRef.current!.getBoundingClientRect();
      setMarquee((prev) => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null);
    },
    [marquee, activeTool, appMode]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (appMode !== 'edit') return;
      if (activeTool !== 'select') {
        clearSelection();
        return;
      }
      
      if (marquee) {
        // Calculate marquee box in web coordinates
        const minX = Math.min(marquee.startX, marquee.currentX);
        const maxX = Math.max(marquee.startX, marquee.currentX);
        const minY = Math.min(marquee.startY, marquee.currentY);
        const maxY = Math.max(marquee.startY, marquee.currentY);

        // If it was just a click (no drag), clear selection
        if (maxX - minX < 5 && maxY - minY < 5) {
          if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            clearSelection();
          }
        } else {
          // Find all fields that intersect the marquee
          const selectedIds: string[] = [];
          pageFields.forEach((f) => {
            // pdfY is bottom edge, so top edge is pdfY + pdfHeight
            const { webX, webY } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
            const webW = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
            const webH = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;

            // Check overlap
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
            // Add to existing selection
            selectedIds.forEach((id) => {
              if (!selectedFieldIds.includes(id)) {
                selectField(id, true);
              }
            });
          } else {
            // Replace selection
            clearSelection();
            selectedIds.forEach((id, index) => {
              selectField(id, index > 0); // first one is false (replace), subsequent are true (append)
            });
          }
        }
        setMarquee(null);
        return;
      }

      // If we are in placement mode, place a field
      if (activeTool !== 'select') {
        // ... (this logic is moved to onClick instead)
      }
    },
    [activeTool, marquee, pageFields, pageMeta, canvasWidth, canvasHeight, clearSelection, selectedFieldIds, selectField, appMode]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === 'select' || appMode !== 'edit') return;
      
      const rect = overlayRef.current!.getBoundingClientRect();
      const webX = e.clientX - rect.left;
      const webY = e.clientY - rect.top;

      const { pdfX, pdfY } = webToPdf(
        webX, webY,
        pageMeta.widthPt, pageMeta.heightPt,
        canvasWidth, canvasHeight,
      );

      const isTextSubtype = ['number', 'currency', 'iban', 'email', 'url'].includes(activeTool);
      const type = isTextSubtype ? 'text' : activeTool as any;
      const sizes = DEFAULT_SIZES[type] || {w: 144, h: 24};
      const id = crypto.randomUUID();
      
      const textSubType = isTextSubtype ? (activeTool as NonNullable<FieldDef['textSubType']>) : undefined;
      const prefix = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);
      
      let counter = 1;
      let baseName = '';
      while (true) {
        baseName = `${prefix} -- ${counter}`;
        if (!fields.some(f => f.name === baseName)) break;
        counter++;
      }

      const newField: FieldDef = {
        id,
        pageIndex: pageMeta.pageIndex,
        type: type,
        name: baseName,
        label: baseName,
        pdfX,
        pdfY: pdfY - sizes.h, // anchor top-left
        pdfWidth: sizes.w,
        pdfHeight: sizes.h,
        fontSize: 12,
        fontWeight: 'regular',
        textSubType,
        options: activeTool === 'dropdown' ? [] : undefined,
        checkedByDefault: activeTool === 'checkbox' ? false : undefined,
        groupName: activeTool === 'radio' ? 'group1' : undefined,
        radioValue: activeTool === 'radio' ? id.slice(0, 4) : undefined,
      };

      addField(newField);
      selectField(id);
      setActiveTool('select');
    },
    [activeTool, pageMeta, canvasWidth, canvasHeight, addField, selectField, setActiveTool, appMode],
  );

  return (
    <div
      ref={overlayRef}
      onPointerDown={appMode === 'edit' ? handlePointerDown : undefined}
      onPointerMove={appMode === 'edit' ? handlePointerMove : undefined}
      onPointerUp={appMode === 'edit' ? handlePointerUp : undefined}
      onPointerLeave={appMode === 'edit' ? handlePointerUp : undefined}
      onClick={appMode === 'edit' ? handleClick : undefined}
      className="absolute inset-0"
      style={{ cursor: appMode === 'edit' && isPlacingMode ? 'crosshair' : 'default', touchAction: 'none' }}
    >
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
      {appMode === 'edit' && selectedFieldIds.map(id => {
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
        const baselineY = webY + (webH / 2) + scaledFontSize * 0.351;

        return (
          <div
            key={`laser-${id}`}
            className="absolute left-0 right-0 border-t border-dashed border-red-500/40 z-40 pointer-events-none"
            style={{ top: baselineY }}
          />
        );
      })}

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
        />
      )}

      {promptModal && (
        <PromptModal
          open={promptModal.open}
          title="Feldname umbenennen:"
          initialValue={promptModal.initialValue}
          onConfirm={(newName) => {
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

// ─── Individual field box ────────────────────────────────────────────────────

interface FieldBoxInnerProps {
  field: FieldDef;
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
  otherFields: FieldDef[];
  onGuidesChange: (guides: GuideLine[]) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  globalDrag: { originId: string; dxWeb: number; dyWeb: number } | null;
  setGlobalDrag: (val: { originId: string; dxWeb: number; dyWeb: number } | null) => void;
  globalResize: { originId: string; handle: string; rx: number; ry: number; rw: number; rh: number } | null;
  setGlobalResize: (val: { originId: string; handle: string; rx: number; ry: number; rw: number; rh: number } | null) => void;
}

function FieldBoxInner({ field, pageMeta, canvasWidth, canvasHeight, otherFields, onGuidesChange, onContextMenu, globalDrag, setGlobalDrag, globalResize, setGlobalResize }: FieldBoxInnerProps) {
  const { selectedFieldIds, selectField, updateField, updateFields, activeTool, fields, snapToGrid } = useEditorStore();
  const isSelected = selectedFieldIds.includes(field.id);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isResizingRef = useRef(false);

  // 10 PDF points in web pixels
  const webGridX = snapToGrid ? (10 / pageMeta.widthPt) * canvasWidth : undefined;
  const webGridY = snapToGrid ? (10 / pageMeta.heightPt) * canvasHeight : undefined;
  
  // Local state for smooth drag/resize
  // Convert PDF coords → web pixels for rendering
  // field.pdfY is bottom edge, so top edge is field.pdfY + field.pdfHeight
  const { webX, webY } = pdfToWeb(
    field.pdfX, field.pdfY + field.pdfHeight,
    pageMeta.widthPt, pageMeta.heightPt,
    canvasWidth, canvasHeight,
  );
  const webW = (field.pdfWidth / pageMeta.widthPt) * canvasWidth;
  const webH = (field.pdfHeight / pageMeta.heightPt) * canvasHeight;

  // Now driven entirely by global state for multi-selection visually
  let rx = 0, ry = 0, rw = 0, rh = 0;
  let dxWeb = 0, dyWeb = 0;

  if (isSelected || (globalDrag?.originId === field.id) || (globalResize?.originId === field.id)) {
    if (globalDrag) {
      dxWeb = globalDrag.dxWeb;
      dyWeb = globalDrag.dyWeb;
    }
    if (globalResize) {
      rx = globalResize.rx;
      ry = globalResize.ry;
      rw = globalResize.rw;
      rh = globalResize.rh;
    }
  }

  // Constrain to minimum dimensions for ALL rendering fields if resizing
  if (globalResize && (isSelected || globalResize.originId === field.id)) {
    if (webW + rw < 16) {
      const diff = 16 - (webW + rw);
      rw += diff;
      if (globalResize.handle.includes('w')) rx -= diff;
    }
    if (webH + rh < 10) {
      const diff = 10 - (webH + rh);
      rh += diff;
      if (globalResize.handle.includes('n')) ry -= diff;
    }
  }

  // Apply local offsets during active drag/resize
  const currentWebX = webX + dxWeb + rx;
  const currentWebY = webY + dyWeb + ry;
  const currentWebW = webW + rw;
  const currentWebH = webH + rh;

  const typeColors: Record<string, string> = {
    text:     'border-blue-400 bg-blue-500/10',
    dropdown: 'border-violet-400 bg-violet-500/10',
    checkbox: 'border-emerald-400 bg-emerald-500/10',
    radio:    'border-amber-400 bg-amber-500/10',
    signature:'border-purple-400 bg-purple-500/10',
    scribble: 'border-fuchsia-400 bg-fuchsia-500/10',
  };

  return (
    <motion.div
      initial={false}
      onPanStart={(e, info) => {
        if (activeTool !== 'select') return;
        if (isResizingRef.current || (e.target as HTMLElement).closest('.resize-handle')) return;
        // If they start dragging an unselected field, select it (clear others)
        if (!isSelected) selectField(field.id);
        dragStartRef.current = { x: info.point.x, y: info.point.y };
      }}
      onPan={(_e, info) => {
        if (activeTool !== 'select' || !dragStartRef.current) return;
        
        let dxWebSnap = info.point.x - dragStartRef.current.x;
        let dyWebSnap = info.point.y - dragStartRef.current.y;

        // Snapping logic
        const movingRect: Rect = {
          id: field.id,
          x: webX + dxWebSnap,
          y: webY + dyWebSnap,
          w: webW,
          h: webH,
        };

        // Do not snap to other fields in the same selection group, because they are moving with us!
        const snappingCandidates = isSelected 
          ? otherFields.filter(f => !selectedFieldIds.includes(f.id))
          : otherFields;

        const otherRects: Rect[] = snappingCandidates.map((f) => {
          // Pass top edge to pdfToWeb
          const { webX: ox, webY: oy } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
          const ow = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
          const oh = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;
          return { id: f.id, x: ox, y: oy, w: ow, h: oh };
        });

        const snapResult = calculateSnaps(movingRect, otherRects, 8, webGridX, webGridY);
        onGuidesChange(snapResult.guides);

        if (snapResult.snappedX !== null) dxWebSnap = snapResult.snappedX - webX;
        if (snapResult.snappedY !== null) dyWebSnap = snapResult.snappedY - webY;

        setGlobalDrag({ originId: field.id, dxWeb: dxWebSnap, dyWeb: dyWebSnap });
      }}
      onPanEnd={() => {
        onGuidesChange([]);
        if (!dragStartRef.current) return;
        if (!globalDrag || globalDrag.originId !== field.id) {
          dragStartRef.current = null;
          return;
        }

        const dxPdf = scaleToPdf(globalDrag.dxWeb, pageMeta.widthPt, canvasWidth);
        const dyPdf = scaleToPdf(globalDrag.dyWeb, pageMeta.heightPt, canvasHeight);
        
        // Move ALL selected fields if this is a selected field
        if (isSelected) {
          const selectedFields = fields.filter((f) => selectedFieldIds.includes(f.id));
          const updates = selectedFields.map((f) => ({
            id: f.id,
            patch: {
              pdfX: f.pdfX + dxPdf,
              pdfY: f.pdfY - dyPdf, // web Y is inverted
            }
          }));
          updateFields(updates);
        } else {
          updateField(field.id, {
            pdfX: field.pdfX + dxPdf,
            pdfY: field.pdfY - dyPdf, // web Y is inverted
          });
        }
        
        dragStartRef.current = null;
        setGlobalDrag(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (activeTool === 'select') {
          // If shift or ctrl is pressed, multi-select
          selectField(field.id, e.ctrlKey || e.metaKey || e.shiftKey);
        }
      }}
      onContextMenu={onContextMenu}
      style={{
        position: 'absolute',
        left: currentWebX,
        top: currentWebY,
        width: currentWebW,
        height: currentWebH,
        cursor: activeTool === 'select' ? 'move' : 'crosshair',
        zIndex: isSelected ? 20 : 10,
        touchAction: 'none',
      }}
      className={`
        rounded border-2 transition-shadow
        ${typeColors[field.type] ?? 'border-zinc-400 bg-zinc-500/10'}
        ${isSelected ? 'shadow-lg shadow-blue-500/20' : ''}
      `}
    >
      {/* Field label */}
      <span
        className="absolute -top-5 left-0 text-[9px] leading-none px-1 py-0.5 rounded
          bg-zinc-900/80 text-zinc-300 truncate max-w-full pointer-events-none select-none"
      >
        {field.label || field.name}
      </span>



      {/* Visual Baseline Indicator */}
      {(field.type === 'text' || field.type === 'date') && (
        <div 
          className="absolute left-0 right-0 border-b border-dashed border-red-500/60 pointer-events-none z-10"
          style={{ 
            top: '50%', 
            transform: `translateY(${(field.fontSize || 12) * (canvasHeight / pageMeta.heightPt) * 0.351}px)` 
          }} 
          title="Text Baseline"
        />
      )}

      {/* Tab Index badge (Edit mode only) */}
      {field.tabIndex !== undefined && (
        <span className="absolute -top-5 right-0 text-[9px] leading-none px-1 py-0.5 rounded
          bg-blue-600/90 text-white truncate max-w-full pointer-events-none select-none shadow-sm">
          Tab {field.tabIndex}
        </span>
      )}

      {/* Resize handles — only when selected & in select mode */}
      {isSelected && activeTool === 'select' && (
        <>
          {[
            { pos: 'nw', cursor: 'nwse-resize', class: '-top-1.5 -left-1.5' },
            { pos: 'n', cursor: 'ns-resize', class: '-top-1.5 left-1/2 -translate-x-1/2' },
            { pos: 'ne', cursor: 'nesw-resize', class: '-top-1.5 -right-1.5' },
            { pos: 'e', cursor: 'ew-resize', class: 'top-1/2 -right-1.5 -translate-y-1/2' },
            { pos: 'se', cursor: 'nwse-resize', class: '-bottom-1.5 -right-1.5' },
            { pos: 's', cursor: 'ns-resize', class: '-bottom-1.5 left-1/2 -translate-x-1/2' },
            { pos: 'sw', cursor: 'nesw-resize', class: '-bottom-1.5 -left-1.5' },
            { pos: 'w', cursor: 'ew-resize', class: 'top-1/2 -left-1.5 -translate-y-1/2' },
          ].map((handle) => (
            <motion.div
              key={handle.pos}
              onPanStart={(e) => {
                e.stopPropagation();
                isResizingRef.current = true;
              }}
              onPan={(e, info) => {
                e.stopPropagation();
                
                const rawX = info.offset.x;
                const rawY = info.offset.y;

                let tempRx = 0, tempRy = 0, tempRw = 0, tempRh = 0;
                if (handle.pos.includes('e')) tempRw = rawX;
                if (handle.pos.includes('w')) { tempRx = rawX; tempRw = -rawX; }
                if (handle.pos.includes('s')) tempRh = rawY;
                if (handle.pos.includes('n')) { tempRy = rawY; tempRh = -rawY; }

                if (webW + tempRw < 16) {
                  const diff = 16 - (webW + tempRw);
                  tempRw += diff;
                  if (handle.pos.includes('w')) tempRx -= diff;
                }
                if (webH + tempRh < 10) {
                  const diff = 10 - (webH + tempRh);
                  tempRh += diff;
                  if (handle.pos.includes('n')) tempRy -= diff;
                }

                // Snap logic for resize
                const otherRects = otherFields.map((f) => {
                  const { webX: ox, webY: oy } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
                  const ow = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
                  const oh = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;
                  return { id: f.id, x: ox, y: oy, w: ow, h: oh };
                });

                const snapResult = calculateResizeSnaps(
                  webX, webY, webW, webH,
                  tempRx, tempRy, tempRw, tempRh,
                  handle.pos,
                  otherRects,
                  field.id,
                  8,
                  webGridX,
                  webGridY
                );

                onGuidesChange(snapResult.guides);
                setGlobalResize({ originId: field.id, handle: handle.pos, rx: snapResult.rx, ry: snapResult.ry, rw: snapResult.rw, rh: snapResult.rh });
              }}
              onPanEnd={(e) => {
                e.stopPropagation();
                isResizingRef.current = false;
                onGuidesChange([]);

                if (!globalResize || globalResize.originId !== field.id) return;
                
                // Use the precise constrained values from global state
                const finalRx = globalResize.rx;
                const finalRy = globalResize.ry;
                const finalRw = globalResize.rw;
                const finalRh = globalResize.rh;

                if (isSelected) {
                  const selectedFieldsList = fields.filter((f) => selectedFieldIds.includes(f.id));
                  selectedFieldsList.forEach((f) => {
                    const fWebW = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
                    const fWebH = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;
                    
                    let fRw = finalRw;
                    let fRh = finalRh;
                    let fRx = finalRx;
                    let fRy = finalRy;

                    // Constrain individual fields
                    if (fWebW + fRw < 16) {
                      const diff = 16 - (fWebW + fRw);
                      fRw += diff;
                      if (handle.pos.includes('w')) fRx -= diff;
                    }
                    if (fWebH + fRh < 10) {
                      const diff = 10 - (fWebH + fRh);
                      fRh += diff;
                      if (handle.pos.includes('n')) fRy -= diff;
                    }

                    const newWidth = scaleToPdf(fWebW + fRw, pageMeta.widthPt, canvasWidth);
                    const newHeight = scaleToPdf(fWebH + fRh, pageMeta.heightPt, canvasHeight);
                    const fDxPdf = scaleToPdf(fRx, pageMeta.widthPt, canvasWidth);
                    const fDyPdf = scaleToPdf(fRy, pageMeta.heightPt, canvasHeight);

                    const newPdfY = (f.pdfY + f.pdfHeight) - fDyPdf - newHeight;

                    updateField(f.id, {
                      pdfX: f.pdfX + fDxPdf,
                      pdfY: newPdfY,
                      pdfWidth: newWidth,
                      pdfHeight: newHeight,
                    });
                  });
                } else {
                  const newWidth = scaleToPdf(webW + finalRw, pageMeta.widthPt, canvasWidth);
                  const newHeight = scaleToPdf(webH + finalRh, pageMeta.heightPt, canvasHeight);
                  const fDxPdf = scaleToPdf(finalRx, pageMeta.widthPt, canvasWidth);
                  const fDyPdf = scaleToPdf(finalRy, pageMeta.heightPt, canvasHeight);

                  const newPdfY = (field.pdfY + field.pdfHeight) - fDyPdf - newHeight;

                  updateField(field.id, {
                    pdfX: field.pdfX + fDxPdf,
                    pdfY: newPdfY,
                    pdfWidth: newWidth,
                    pdfHeight: newHeight,
                  });
                }
                setGlobalResize(null);
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => {
                e.stopPropagation();
                isResizingRef.current = true;
              }}
              onPointerUp={() => {
                isResizingRef.current = false;
              }}
              onPointerLeave={() => {
                isResizingRef.current = false;
              }}
              style={{ touchAction: 'none', cursor: handle.cursor }}
              className={`resize-handle absolute w-3 h-3 rounded-sm bg-blue-500 border border-white z-30 ${handle.class}`}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}

// ─── Date Parsing Utility ────────────────────────────────────────────────────

function parseDateString(input: string, format: string, locale: string): Date | null {
  let resolvedFormat = format;

  if (!resolvedFormat || resolvedFormat === 'auto') {
    if (input.includes('.')) {
      resolvedFormat = 'DD.MM.YYYY';
    } else if (input.includes('/')) {
      if (locale.startsWith('en') && !locale.startsWith('en-GB')) {
        resolvedFormat = 'MM/DD/YYYY';
      } else {
        resolvedFormat = 'DD/MM/YYYY';
      }
    } else if (input.includes('-')) {
      resolvedFormat = 'YYYY-MM-DD';
    } else {
      if (locale.startsWith('de')) resolvedFormat = 'DD.MM.YYYY';
      else if (locale.startsWith('en')) resolvedFormat = 'MM/DD/YYYY';
      else if (locale.startsWith('fr') || locale.startsWith('es')) resolvedFormat = 'DD/MM/YYYY';
      else resolvedFormat = 'YYYY-MM-DD';
    }
  }

  const parts = input.match(/\d+/g);
  if (!parts || parts.length < 3) return null;

  let year, month, day;
  if (resolvedFormat === 'DD.MM.YYYY' || resolvedFormat === 'DD/MM/YYYY') {
    day = parseInt(parts[0], 10); month = parseInt(parts[1], 10); year = parseInt(parts[2], 10);
  } else if (resolvedFormat === 'MM/DD/YYYY') {
    month = parseInt(parts[0], 10); day = parseInt(parts[1], 10); year = parseInt(parts[2], 10);
  } else if (resolvedFormat === 'YYYY-MM-DD') {
    year = parseInt(parts[0], 10); month = parseInt(parts[1], 10); day = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (year < 100) {
    year += year > 50 ? 1900 : 2000;
  }

  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return d;
}

function isValidIBAN(iban: string) {
  const str = iban.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (str.length < 15 || str.length > 34) return false;
  const reordered = str.substring(4) + str.substring(0, 4);
  const numeric = reordered.split('').map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 && code <= 90 ? (code - 55).toString() : c;
  }).join('');
  let remainder = numeric;
  let block;
  while (remainder.length > 2) {
    block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97) + remainder.slice(block.length);
  }
  return parseInt(remainder, 10) % 97 === 1;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidURL(url: string) {
  const pattern = new RegExp(
    '^([a-zA-Z]+:\\/\\/)?' + // protocol
    '((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-zA-Z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-zA-Z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-zA-Z\\d_]*)?$', 'i'
  );
  return !!pattern.test(url);
}

function parseNumberStrict(val: string) {
  if (!val) return NaN;
  if (val.includes(',') && (!val.includes('.') || val.indexOf('.') < val.indexOf(','))) {
     return parseFloat(val.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(val.replace(/,/g, ''));
}

// ─── Preview Field Box ───────────────────────────────────────────────────────

interface PreviewFieldBoxProps {
  field: FieldDef;
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
}

function PreviewFieldBox({ field, pageMeta, canvasWidth, canvasHeight }: PreviewFieldBoxProps) {
  const { updateField, fields } = useEditorStore();
  const { i18n } = useTranslation();

  // Find if this is a duplicate (i.e. not the first field with this name)
  const isDuplicate = fields.find(f => f.name === field.name)?.id !== field.id;

  const { webX, webY } = pdfToWeb(
    field.pdfX, field.pdfY + field.pdfHeight,
    pageMeta.widthPt, pageMeta.heightPt,
    canvasWidth, canvasHeight,
  );
  const webW = (field.pdfWidth / pageMeta.widthPt) * canvasWidth;
  const webH = (field.pdfHeight / pageMeta.heightPt) * canvasHeight;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: webX,
    top: webY,
    width: webW,
    height: webH,
    zIndex: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    border: '1px solid rgba(59, 130, 246, 0.5)',
    borderRadius: '2px',
    color: '#111827',
    fontFamily: field.fontFamily === 'monospace' ? 'monospace' : 'Inter, sans-serif',
    textAlign: field.textAlign || 'left',
    fontSize: field.fontSize ? `${field.fontSize}px` : '12px',
    fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (field.type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      updateField(field.id, { checked: target.checked });
    } else if (field.type === 'radio') {
      const target = e.target as HTMLInputElement;
      updateField(field.id, { checked: target.checked });
    } else {
      let val = e.target.value;
      if (field.type === 'text') {
        if (field.textSubType === 'number') {
          val = val.replace(/[^\d.,\-]/g, '');
        } else if (field.textSubType === 'currency') {
          // Allow digits, dot, comma, minus, space, and characters from the currency symbol
          // Escape special regex characters in the symbol
          const escapedSymbol = (field.currencySymbol || '€').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`[^\\d.,\\-\\s${escapedSymbol}]`, 'g');
          val = val.replace(regex, '');
        }
      }
      updateField(field.id, { value: val });
    }
  };

  if (field.type === 'text') {
    const [validationModal, setValidationModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
    const inputRef = useRef<HTMLInputElement>(null);

    const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (validationModal.open) return;
      const val = e.target.value.trim();
      if (!val) return;

      setTimeout(() => {
        if (field.textSubType === 'currency') {
          const num = parseNumberStrict(val.replace(/[^\d.,\-]/g, ''));
          if (!isNaN(num)) {
            const symbol = field.currencySymbol || '€';
            const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' ' + symbol;
            updateField(field.id, { value: formatted });
          }
        } else if (field.textSubType === 'iban') {
          if (!isValidIBAN(val)) {
            setValidationModal({ open: true, title: 'Ungültige IBAN', message: 'Die eingegebene IBAN ist nicht korrekt.' });
          }
        } else if (field.textSubType === 'email') {
          if (!isValidEmail(val)) {
            setValidationModal({ open: true, title: 'Ungültige E-Mail', message: 'Die eingegebene E-Mail-Adresse ist nicht korrekt.' });
          }
        } else if (field.textSubType === 'url') {
          if (!isValidURL(val)) {
            setValidationModal({ open: true, title: 'Ungültige URL', message: 'Die eingegebene URL ist nicht korrekt.' });
          }
        }
      }, 250);
    };

    const handleCorrect = () => {
      setValidationModal({ open: false, title: '', message: '' });
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    return (
      <>
        <input
          ref={inputRef}
          type="text"
          style={baseStyle}
          value={field.value || ''}
          onChange={handleChange}
          onBlur={handleTextBlur}
          readOnly={isDuplicate}
          tabIndex={field.tabIndex}
          className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDuplicate ? 'bg-slate-100/50 cursor-not-allowed' : 'bg-white'}`}
        />
        <TextValidationModal
          open={validationModal.open}
          title={validationModal.title}
          message={validationModal.message}
          onCorrect={handleCorrect}
        />
      </>
    );
  }

  if (field.type === 'date') {
    const [validationModal, setValidationModal] = useState<{ open: boolean; type: 'invalid' | 'history' | 'future' | null }>({ open: false, type: null });
    const inputRef = useRef<HTMLInputElement>(null);

    const runValidation = (val: string) => {
      const parsedDate = parseDateString(val, field.dateFormat || 'auto', i18n.language);
      
      if (!parsedDate) {
        setValidationModal({ open: true, type: 'invalid' });
      } else {
        const year = parsedDate.getFullYear();
        if (year < 1900) {
          setValidationModal({ open: true, type: 'history' });
        } else if (year > 2199) {
          setValidationModal({ open: true, type: 'future' });
        }
      }
    };

    // Use a longer timeout (250ms) to let the browser finish any scroll/focus reflows before opening the modal
    const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Prevent blurring if modal is already open
      if (validationModal.open) return;

      const val = e.target.value.trim();
      if (!val) return;

      setTimeout(() => {
        runValidation(val);
      }, 250);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
    };

    const handleConfirm = () => {
      setValidationModal({ open: false, type: null });
      // Keep value
    };

    const handleCorrect = () => {
      setValidationModal({ open: false, type: null });
      // Wait for the exit animation (approx 150ms) before refocusing to avoid layout shifts
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    return (
      <>
        <input
          ref={inputRef}
          type="text"
          style={baseStyle}
          value={field.value || ''}
          onChange={handleChange}
          onBlur={handleDateBlur}
          onKeyDown={handleKeyDown}
          readOnly={isDuplicate}
          tabIndex={field.tabIndex}
          className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDuplicate ? 'bg-slate-100/50 cursor-not-allowed' : 'bg-white'}`}
        />
        <DateValidationModal
          open={validationModal.open}
          type={validationModal.type}
          onConfirm={handleConfirm}
          onCorrect={handleCorrect}
        />
      </>
    );
  }

  if (field.type === 'dropdown') {
    return (
      <select
        style={baseStyle}
        value={field.value || field.defaultOption || ''}
        onChange={handleChange}
        disabled={isDuplicate}
        tabIndex={field.tabIndex}
        className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDuplicate ? 'bg-slate-100/50 cursor-not-allowed' : 'bg-white'}`}
      >
        <option value=""></option>
        {field.options?.map((opt, i) => (
          <option key={i} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none' }}>
        <input
          type="checkbox"
          checked={field.checked ?? field.checkedByDefault ?? false}
          onChange={handleChange}
          disabled={isDuplicate}
          tabIndex={field.tabIndex}
          className={`w-full h-full accent-blue-600 ${isDuplicate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none' }}>
        <input
          type="radio"
          name={field.groupName}
          value={field.radioValue}
          checked={field.checked ?? false}
          onChange={handleChange}
          disabled={isDuplicate}
          tabIndex={field.tabIndex}
          className={`w-full h-full accent-blue-600 ${isDuplicate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        />
      </div>
    );
  }

  if (field.type === 'signature') {
    return (
      <div style={{ ...baseStyle, backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="text-[10px] text-slate-400 font-medium px-2 text-center leading-tight">
          Kryptografische Signatur<br/>(Acrobat)
        </span>
      </div>
    );
  }

  if (field.type === 'scribble') {
    const [modalOpen, setModalOpen] = useState(false);
    return (
      <>
        <button
          style={{ ...baseStyle, backgroundColor: field.value ? 'transparent' : '#f8fafc', border: field.value ? 'none' : '1px dashed #cbd5e1', cursor: isDuplicate ? 'not-allowed' : 'pointer', padding: 0 }}
          onClick={() => !isDuplicate && setModalOpen(true)}
          disabled={isDuplicate}
          tabIndex={field.tabIndex}
        >
          {field.value ? (
            <img src={field.value} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <span className="text-[10px] text-slate-400 font-medium px-2 text-center">
              Klicken zum Signieren
            </span>
          )}
        </button>
        {modalOpen && (
          <ScribbleModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            onSave={(dataUri) => {
              updateField(field.id, { value: dataUri });
              setModalOpen(false);
            }}
            initialValue={field.value}
          />
        )}
      </>
    );
  }

  return null;
}
