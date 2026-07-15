import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useEditorStore } from '../../store/useEditorStore';
import { pdfToWeb, scaleToPdf } from '../../utils/coordinateMapper';
import type { FieldDef, PageMeta } from '../../types';
import { calculateSnaps, calculateResizeSnaps, type GuideLine, type Rect } from '../../utils/snapping';
import { toast } from '../common/Toast';
import {
  TextFieldRenderer,
  DateFieldRenderer,
  DropdownRenderer,
  CheckboxRenderer,
  RadioRenderer,
  SignatureRenderer,
  ScribbleRenderer,
  BarcodeRenderer,
  ButtonRenderer,
  TimeFieldRenderer,
  ScaleRatingFieldRenderer,
  InputTableFieldRenderer,
  YesNoFieldRenderer
} from './fields/renderers';

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

export function FieldBoxInner({ field, pageMeta, canvasWidth, canvasHeight, otherFields, onGuidesChange, onContextMenu, globalDrag, setGlobalDrag, globalResize, setGlobalResize }: FieldBoxInnerProps) {
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
    text:      'bg-blue-500/20 border-blue-500',
    dropdown:  'bg-orange-500/20 border-orange-500',
    checkbox:  'bg-green-500/20 border-green-500',
    radio:     'bg-emerald-500/20 border-emerald-500',
    date:      'bg-purple-500/20 border-purple-500',
    signature: 'bg-red-500/20 border-red-500',
    scribble:  'bg-pink-500/20 border-pink-500',
    barcode:   'bg-indigo-500/20 border-indigo-500',
    button:    'bg-cyan-500/20 border-cyan-500',
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
        rounded border-[1px] transition-shadow
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



// ─── Preview Field Box ───────────────────────────────────────────────────────

interface PreviewFieldBoxProps {
  field: FieldDef;
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
}

export function PreviewFieldBox({ field, pageMeta, canvasWidth, canvasHeight }: PreviewFieldBoxProps) {
  const { updateField, fields } = useEditorStore();

  // Find if this is a duplicate (i.e. not the first field with this name)
  const isDuplicate = fields.find(f => f.name === field.name)?.id !== field.id;

  let isGreyedOut = false;
  if (field.enableCondition) {
    const ctrlField = fields.find(f => f.id === field.enableCondition!.targetFieldId);
    if (ctrlField) {
      if (field.enableCondition.condition === 'isChecked') {
        const isChecked = ctrlField.checked ?? ctrlField.checkedByDefault ?? false;
        if (!isChecked) isGreyedOut = true;
      } else {
        let val = field.enableCondition.value || '';
        if (ctrlField.type === 'radio') {
          val = ctrlField.radioValue || ctrlField.id.slice(0, 8);
        }
        let ctrlVal = ctrlField.value || '';
        if (ctrlField.type === 'radio') {
          // If the control field is a radio button, its value is its radioValue if checked, otherwise it's 'Off' or empty.
          // But actually, the PDF uses the group value. For the preview, if THIS radio button is checked, 
          // we treat its ctrlVal as its radioValue. If it's not checked, we check if another radio in the group is checked.
          if (ctrlField.checked) {
            ctrlVal = ctrlField.radioValue || ctrlField.id.slice(0, 8);
          } else {
            // Check if any other radio in the same group is checked
            const groupChecked = fields.find(f => f.type === 'radio' && (f.groupName || f.name) === (ctrlField.groupName || ctrlField.name) && f.checked);
            ctrlVal = groupChecked ? (groupChecked.radioValue || groupChecked.id.slice(0, 8)) : 'Off';
          }
        }
        
        if (val === '*') {
          if (!ctrlVal || ctrlVal === 'Off') isGreyedOut = true;
        } else {
          if (ctrlVal !== val) isGreyedOut = true;
        }
      }
    }
  }

  const isDisabled = isDuplicate || isGreyedOut;

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
    fontSize: `${(field.fontSize || 12) * (canvasHeight / pageMeta.heightPt)}px`,
    fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isDisabled) return;
    if (field.type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      updateField(field.id, { checked: target.checked });
    } else if (field.type === 'radio') {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        fields.forEach(f => {
          if (f.type === 'radio' && (f.groupName || f.name) === (field.groupName || field.name)) {
            updateField(f.id, { checked: f.id === field.id });
          }
        });
      } else {
        updateField(field.id, { checked: false });
      }
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


  switch (field.type) {
    case 'text':
      return <TextFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'date':
      return <DateFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'dropdown':
      return <DropdownRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'checkbox':
      return <CheckboxRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'radio':
      return <RadioRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'time':
      return <TimeFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'scaleRating':
      return <ScaleRatingFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'inputTable':
      return <InputTableFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'yesNo':
      return <YesNoFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'signature':
      return <SignatureRenderer baseStyle={baseStyle} />;
    case 'scribble':
      return <ScribbleRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'barcode':
      return <BarcodeRenderer field={field} baseStyle={baseStyle} />;
    case 'button':
      return (
        <ButtonRenderer 
          field={field} 
          baseStyle={baseStyle} 
          isDisabled={isDisabled}
          onClick={() => {
            // Triggering a toast notification to simulate the button action in preview mode
            toast.info(`Vorschau: Hier würde die Aktion '${field.buttonAction === 'lock' ? 'Formular Sperren' : 'Submit Webhook'}' ausgeführt werden.`);
          }}
        />
      );
    default:
      return null;
  }
}
