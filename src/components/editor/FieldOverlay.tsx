import { motion } from 'framer-motion';
import { useRef, useCallback, useState, useEffect } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { webToPdf, pdfToWeb, scaleToPdf } from '../../utils/coordinateMapper';
import type { FieldDef, PageMeta } from '../../types';
import { calculateSnaps, type GuideLine, type Rect } from '../../utils/snapping';
import { Copy } from 'lucide-react';

// Default field dimensions in PDF points
const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  text:     { w: 144, h: 24 },
  dropdown: { w: 144, h: 24 },
  checkbox: { w: 16,  h: 16 },
  radio:    { w: 16,  h: 16 },
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
  const { fields, addField, selectField, activeTool, setActiveTool, selectedFieldIds, updateField, clearSelection, appMode } = useEditorStore();
  const overlayRef = useRef<HTMLDivElement>(null);

  const pageFields = fields.filter((f) => f.pageIndex === pageMeta.pageIndex);
  const isPlacingMode = activeTool !== 'select';

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fieldId: string } | null>(null);
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);

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
      selectedFieldsOnPage.forEach((field) => {
        updateField(field.id, {
          pdfX: field.pdfX + dx,
          pdfY: field.pdfY + dy,
        });
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldIds, fields, activeTool, pageMeta.pageIndex, updateField, appMode]);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    const id = crypto.randomUUID();
    const newField: FieldDef = {
      ...sourceField,
      id,
      name: `${sourceField.name}_copy`,
      pdfY: sourceField.pdfY - sourceField.pdfHeight - 10, // place 10pt below
    };
    addField(newField);
    selectField(id);
    setContextMenu(null);
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

      const sizes = DEFAULT_SIZES[activeTool];
      const id = crypto.randomUUID();
      const baseName = `${activeTool}_${id.slice(0, 6)}`;

      const newField: FieldDef = {
        id,
        pageIndex: pageMeta.pageIndex,
        type: activeTool,
        name: baseName,
        label: activeTool.charAt(0).toUpperCase() + activeTool.slice(1),
        pdfX,
        pdfY: pdfY - sizes.h, // anchor top-left
        pdfWidth: sizes.w,
        pdfHeight: sizes.h,
        fontSize: 12,
        fontWeight: 'regular',
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

      {/* Context Menu */}
      {contextMenu && appMode === 'edit' && (
        <div
          className="absolute z-50 bg-zinc-800 border border-zinc-700 rounded-md shadow-xl py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleDuplicate}
            className="w-full text-left px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-700 hover:text-white flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
        </div>
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
}

function FieldBoxInner({ field, pageMeta, canvasWidth, canvasHeight, otherFields, onGuidesChange, onContextMenu }: FieldBoxInnerProps) {
  const { selectedFieldIds, selectField, updateField, activeTool, fields } = useEditorStore();
  const isSelected = selectedFieldIds.includes(field.id);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  
  // Local state for smooth drag/resize
  const [dragOffset, setDragOffset] = useState({ dxWeb: 0, dyWeb: 0 });
  const [resizeOffset, setResizeOffset] = useState({ dwWeb: 0, dhWeb: 0 });

  // Convert PDF coords → web pixels for rendering
  // field.pdfY is bottom edge, so top edge is field.pdfY + field.pdfHeight
  const { webX, webY } = pdfToWeb(
    field.pdfX, field.pdfY + field.pdfHeight,
    pageMeta.widthPt, pageMeta.heightPt,
    canvasWidth, canvasHeight,
  );
  const webW = (field.pdfWidth / pageMeta.widthPt) * canvasWidth;
  const webH = (field.pdfHeight / pageMeta.heightPt) * canvasHeight;

  // Apply local offsets during active drag/resize
  const currentWebX = webX + dragOffset.dxWeb;
  const currentWebY = webY + dragOffset.dyWeb;
  const currentWebW = Math.max(16, webW + resizeOffset.dwWeb);
  const currentWebH = Math.max(10, webH + resizeOffset.dhWeb);

  const typeColors: Record<string, string> = {
    text:     'border-blue-400 bg-blue-500/10',
    dropdown: 'border-violet-400 bg-violet-500/10',
    checkbox: 'border-emerald-400 bg-emerald-500/10',
    radio:    'border-amber-400 bg-amber-500/10',
  };

  return (
    <motion.div
      initial={false}
      onPanStart={(_e, info) => {
        if (activeTool !== 'select') return;
        // If they start dragging an unselected field, select it (clear others)
        if (!isSelected) selectField(field.id);
        dragStartRef.current = { x: info.point.x, y: info.point.y };
      }}
      onPan={(_e, info) => {
        if (activeTool !== 'select' || !dragStartRef.current) return;
        
        let dxWeb = info.point.x - dragStartRef.current.x;
        let dyWeb = info.point.y - dragStartRef.current.y;

        // Snapping logic
        const movingRect: Rect = {
          id: field.id,
          x: webX + dxWeb,
          y: webY + dyWeb,
          w: webW,
          h: webH,
        };

        const otherRects: Rect[] = otherFields.map((f) => {
          // Pass top edge to pdfToWeb
          const { webX: ox, webY: oy } = pdfToWeb(f.pdfX, f.pdfY + f.pdfHeight, pageMeta.widthPt, pageMeta.heightPt, canvasWidth, canvasHeight);
          const ow = (f.pdfWidth / pageMeta.widthPt) * canvasWidth;
          const oh = (f.pdfHeight / pageMeta.heightPt) * canvasHeight;
          return { id: f.id, x: ox, y: oy, w: ow, h: oh };
        });

        const snapResult = calculateSnaps(movingRect, otherRects, 8);
        onGuidesChange(snapResult.guides);

        if (snapResult.snappedX !== null) dxWeb = snapResult.snappedX - webX;
        if (snapResult.snappedY !== null) dyWeb = snapResult.snappedY - webY;

        setDragOffset({ dxWeb, dyWeb });
      }}
      onPanEnd={() => {
        onGuidesChange([]);
        if (!dragStartRef.current) return;
        const dxPdf = scaleToPdf(dragOffset.dxWeb, pageMeta.widthPt, canvasWidth);
        const dyPdf = scaleToPdf(dragOffset.dyWeb, pageMeta.heightPt, canvasHeight);
        
        // Move ALL selected fields if this is a selected field
        if (isSelected) {
          const selectedFields = fields.filter((f) => selectedFieldIds.includes(f.id));
          selectedFields.forEach((f) => {
            updateField(f.id, {
              pdfX: f.pdfX + dxPdf,
              pdfY: f.pdfY - dyPdf, // web Y is inverted
            });
          });
        } else {
          updateField(field.id, {
            pdfX: field.pdfX + dxPdf,
            pdfY: field.pdfY - dyPdf, // web Y is inverted
          });
        }
        
        dragStartRef.current = null;
        setDragOffset({ dxWeb: 0, dyWeb: 0 });
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
        rounded border-2 border-dashed transition-shadow
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

      {/* Type icon badge */}
      <span className="absolute bottom-0.5 right-0.5 text-[8px] text-zinc-500 pointer-events-none select-none uppercase font-mono">
        {field.type.slice(0, 3)}
      </span>

      {/* Resize handle (bottom-right) — only when selected & in select mode */}
      {isSelected && activeTool === 'select' && (
        <motion.div
          onPan={(_e, info) => {
            setResizeOffset({ dwWeb: info.offset.x, dhWeb: info.offset.y });
          }}
          onPanEnd={() => {
            const dwPdf = scaleToPdf(currentWebW, pageMeta.widthPt, canvasWidth) - field.pdfWidth;
            const dhPdf = scaleToPdf(currentWebH, pageMeta.heightPt, canvasHeight) - field.pdfHeight;

            if (isSelected) {
              const selectedFieldsList = fields.filter((f) => selectedFieldIds.includes(f.id));
              selectedFieldsList.forEach((f) => {
                const newWidth = Math.max(5, f.pdfWidth + dwPdf);
                const newHeight = Math.max(5, f.pdfHeight + dhPdf);
                updateField(f.id, {
                  pdfWidth: newWidth,
                  pdfHeight: newHeight,
                  pdfY: f.pdfY - (newHeight - f.pdfHeight),
                });
              });
            } else {
              const newWidth = scaleToPdf(currentWebW, pageMeta.widthPt, canvasWidth);
              const newHeight = scaleToPdf(currentWebH, pageMeta.heightPt, canvasHeight);
              updateField(field.id, {
                pdfWidth: newWidth,
                pdfHeight: newHeight,
                pdfY: field.pdfY - (newHeight - field.pdfHeight),
              });
            }
            setResizeOffset({ dwWeb: 0, dhWeb: 0 });
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ touchAction: 'none' }}
          className="absolute -bottom-1.5 -right-1.5 w-3 h-3 rounded-sm bg-blue-500 border border-white cursor-se-resize z-30"
        />
      )}
    </motion.div>
  );
}

// ─── Preview Field Box ───────────────────────────────────────────────────────

interface PreviewFieldBoxProps {
  field: FieldDef;
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
}

function PreviewFieldBox({ field, pageMeta, canvasWidth, canvasHeight }: PreviewFieldBoxProps) {
  const { updateField } = useEditorStore();

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
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (field.type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      updateField(field.id, { checked: target.checked });
    } else if (field.type === 'radio') {
      const target = e.target as HTMLInputElement;
      // When a radio is checked, it gets this value
      updateField(field.id, { checked: target.checked });
      // In a real radio group, checking one unchecks others, but since they are individual fields in our store
      // we might need to uncheck others with the same groupName.
      // For simplicity and immediate visual feedback, updating its own checked state is a good start.
      // If we need cross-field updates, we can do it via a store action, but for now this works.
    } else {
      updateField(field.id, { value: e.target.value });
    }
  };

  if (field.type === 'text') {
    return (
      <input
        type="text"
        style={baseStyle}
        value={field.value || ''}
        onChange={handleChange}
        className="px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
      />
    );
  }

  if (field.type === 'dropdown') {
    return (
      <select
        style={baseStyle}
        value={field.value || field.defaultOption || ''}
        onChange={handleChange}
        className="px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
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
          className="w-full h-full cursor-pointer accent-blue-600"
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
          className="w-full h-full cursor-pointer accent-blue-600"
        />
      </div>
    );
  }

  return null;
}
