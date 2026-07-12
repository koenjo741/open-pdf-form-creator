import { useState } from 'react';
import { PDFDocument, PDFName, PDFBool, PDFString, StandardFonts, TextAlignment } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { saveAs } from 'file-saver';
import { useEditorStore } from '../store/useEditorStore';
import { loadInterRegular, loadInterBold } from '../utils/fontLoader';
import { toast } from '../components/common/Toast';
import type { ExportMode } from '../types';

function triggerDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as any], { type: 'application/pdf' });
  saveAs(blob, filename);
}

/** Generate a safe output filename */
function buildFilename(original: string | null, mode: ExportMode): string {
  const base = original?.replace(/\.pdf$/i, '') ?? 'document';
  return mode === 'editable' ? `${base}__editable.pdf` : `${base}__finalized.pdf`;
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { pdfBuffer, fields, pdfFileName } = useEditorStore();

  const exportPdf = async (mode: ExportMode) => {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      toast.error('No PDF loaded.');
      return;
    }

    setIsExporting(true);
    try {
      // 1. Load fonts
      let fontRegular: Uint8Array;
      let fontBold: Uint8Array;
      try {
        [fontRegular, fontBold] = await Promise.all([
          loadInterRegular(),
          loadInterBold(),
        ]);
      } catch {
        toast.error('Inter font files missing from /public/fonts/. See README.');
        setIsExporting(false);
        return;
      }

      // 2. Load the original PDF — slice to a clean ArrayBuffer
      const srcBuffer = pdfBuffer.slice(0).buffer as ArrayBuffer;
      const pdfDoc = await PDFDocument.load(srcBuffer, { ignoreEncryption: false });
      pdfDoc.registerFontkit(fontkit);

      // 3. Embed fonts
      const embeddedRegular = await pdfDoc.embedFont(fontRegular);
      const embeddedBold = await pdfDoc.embedFont(fontBold);

      // 4. Get or create form
      const form = pdfDoc.getForm();

      // 5. Set NeedAppearances so PDF viewers regenerate appearances
      form.acroForm.dict.set(PDFName.of('NeedAppearances'), PDFBool.True);

      // 5.5 Enforce Annotation Array order for Tabbing
      for (const page of pdfDoc.getPages()) {
        page.node.set(PDFName.of('Tabs'), PDFName.of('A'));
      }

      // Prepare Calculation Order (CO) array
      const coArray = pdfDoc.context.obj([]);

      // 6. Sort and add fields
      // Acrobat uses the Annots array order to determine Tab order if /Tabs is not strictly structure.
      const sortedFields = [...fields].sort((a, b) => {
        if (a.tabIndex !== undefined && b.tabIndex !== undefined) {
          return a.tabIndex - b.tabIndex;
        }
        // Explicit tabIndex comes before geometric sort
        if (a.tabIndex !== undefined) return -1;
        if (b.tabIndex !== undefined) return 1;
        
        // Geometric fallback: top-to-bottom, then left-to-right
        // Origin is bottom-left, so top edge is pdfY + pdfHeight.
        const aTop = a.pdfY + a.pdfHeight;
        const bTop = b.pdfY + b.pdfHeight;
        
        // If roughly on the same row (e.g. within 5 points), sort by X (left-to-right)
        if (Math.abs(aTop - bTop) < 5) {
          return a.pdfX - b.pdfX;
        }
        
        // Sort top-to-bottom (highest top edge first)
        return bTop - aTop;
      });

      for (const field of sortedFields) {
        const page = pdfDoc.getPage(field.pageIndex);
        // pdf-lib uses bottom-left origin — same as our stored coords ✓
        const rect = {
          x: field.pdfX,
          y: field.pdfY,
          width: field.pdfWidth,
          height: field.pdfHeight,
        };
          // 1. Determine base font (proportional or monospace)
          let font;
          if (field.fontFamily === 'monospace') {
            const monoType = field.fontWeight === 'bold' ? StandardFonts.CourierBold : StandardFonts.Courier;
            font = await pdfDoc.embedFont(monoType);
          } else {
            font = field.fontWeight === 'bold' ? embeddedBold : embeddedRegular;
          }

          const fontSize = field.fontSize ?? 12;

          try {
            const existingField = form.getFieldMaybe(field.name);
            const isDuplicate = !!existingField;

            switch (field.type) {
            case 'text':
            case 'date': {
              const tf = existingField ? form.getTextField(field.name) : form.createTextField(field.name);
              tf.addToPage(page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
              
              if (isDuplicate) {
                const widgets = tf.acroField.getWidgets();
                if (widgets.length > 0) {
                  const newWidget = widgets[widgets.length - 1];
                  newWidget.setFlags(newWidget.getFlags() | 64); // ReadOnly (bit 7)
                }
              } else {
                tf.setFontSize(fontSize);
                tf.disableMultiline();

                if (field.textAlign === 'center') tf.setAlignment(TextAlignment.Center);
                else if (field.textAlign === 'right') tf.setAlignment(TextAlignment.Right);
                else tf.setAlignment(TextAlignment.Left);

                if (field.value) {
                  tf.setText(field.value);
                }

                if (field.isRequired) tf.enableRequired();
                else tf.disableRequired();
                
                // Handle calculation
                if (field.calculation) {
                  const isNumber = field.textSubType === 'number';
                  let jsStr = '';
                  if (isNumber) {
                    jsStr = field.calculation.replace(/\[([^\]]+)\]/g, '(Number(this.getField("$1").value) || 0)');
                  } else {
                    jsStr = field.calculation.replace(/\[([^\]]+)\]/g, 'this.getField("$1").value');
                  }
                  const jsCode = `event.value = ${jsStr};`;
                  
                  const jsAction = pdfDoc.context.obj({
                    Type: 'Action',
                    S: 'JavaScript',
                    JS: PDFString.of(jsCode)
                  });
                  
                  const aaDict = pdfDoc.context.obj({
                    C: jsAction
                  });
                  
                  tf.acroField.dict.set(PDFName.of('AA'), aaDict);
                  coArray.push(tf.acroField.ref);
                }
              }

              try { tf.updateAppearances(font); } catch { /* ignore */ }
              break;
            }
            case 'dropdown': {
              const dd = existingField ? form.getDropdown(field.name) : form.createDropdown(field.name);
              dd.addToPage(page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
              
              if (isDuplicate) {
                const widgets = dd.acroField.getWidgets();
                if (widgets.length > 0) {
                  const newWidget = widgets[widgets.length - 1];
                  newWidget.setFlags(newWidget.getFlags() | 64); // ReadOnly
                }
              } else {
                dd.setFontSize(fontSize);
                if (field.options && field.options.length > 0) {
                  dd.setOptions(field.options);
                  if (field.value && field.options.includes(field.value)) {
                    dd.select(field.value);
                  } else if (field.defaultOption && field.options.includes(field.defaultOption)) {
                    dd.select(field.defaultOption);
                  }
                }
                if (field.isRequired) dd.enableRequired();
                else dd.disableRequired();
              }
              try { dd.updateAppearances(font); } catch { /* ignore */ }
              break;
            }
            case 'checkbox': {
              const cb = existingField ? form.getCheckBox(field.name) : form.createCheckBox(field.name);
              cb.addToPage(page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
              
              if (isDuplicate) {
                const widgets = cb.acroField.getWidgets();
                if (widgets.length > 0) {
                  const newWidget = widgets[widgets.length - 1];
                  newWidget.setFlags(newWidget.getFlags() | 64); // ReadOnly
                }
              } else {
                if (field.checked !== undefined) {
                  if (field.checked) cb.check();
                } else if (field.checkedByDefault) {
                  cb.check();
                }
                if (field.isRequired) cb.enableRequired();
                else cb.disableRequired();
              }
              // checkbox.updateAppearances() signature varies by pdf-lib version
              try { (cb as unknown as { updateAppearances: () => void }).updateAppearances(); } catch { /* ignore */ }
              break;
            }
            case 'radio': {
              // Radio buttons sharing a groupName form one AcroForm RadioGroup
              const groupName = field.groupName ?? field.name;
              let radioGroup = tryGetRadioGroup(form, groupName);
              if (!radioGroup) {
                radioGroup = form.createRadioGroup(groupName);
              }
              const optionValue = field.radioValue ?? field.id.slice(0, 8);
              // Note: radio button borders are drawn differently, but borderWidth: 0 hides the outer box
              radioGroup.addOptionToPage(optionValue, page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
              
              if (field.value === optionValue) {
                radioGroup.select(optionValue);
              } else if (!field.value && field.checkedByDefault) {
                radioGroup.select(optionValue);
              }
              if (field.isRequired) radioGroup.enableRequired();
              else radioGroup.disableRequired();
              try { radioGroup.updateAppearances(); } catch { /* ignore */ }
              break;
            }
          }
        } catch (fieldErr) {
          console.warn(`[PDF Export] Could not add field "${field.name}":`, fieldErr);
        }
      }

      // Add CO array to AcroForm if there are calculated fields
      if (coArray.size() > 0) {
        form.acroForm.dict.set(PDFName.of('CO'), coArray);
      }

      // 7. Flatten if requested or embed state if editable
      if (mode === 'flattened') {
        form.flatten();
      } else {
        // Embed our custom JSON state for lossless re-import
        const statePayload = {
          version: 1,
          app: 'OpenPdfFormCreator',
          fields: fields,
        };
        const base64State = btoa(encodeURIComponent(JSON.stringify(statePayload)));
        
        // Chunk the string to avoid the 32,767 byte limit for PDF literal strings (PDF 1.7 spec)
        const chunkSize = 30000;
        const chunks = [];
        for (let i = 0; i < base64State.length; i += chunkSize) {
          chunks.push(PDFString.of(base64State.slice(i, i + chunkSize)));
        }
        
        const arrayObj = pdfDoc.context.obj(chunks);
        pdfDoc.catalog.set(PDFName.of('OpenPdfFormCreatorState'), arrayObj);
      }

      // 8. Save & download
      const rawBytes = await pdfDoc.save();
      triggerDownload(rawBytes, buildFilename(pdfFileName, mode));
      toast.success(mode === 'editable' ? 'Editable PDF downloaded!' : 'Finalized PDF downloaded!');
    } catch (err) {
      console.error('[PDF Export]', err);
      toast.error('PDF generation failed. Check the console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  return { exportPdf, isExporting };
}

/** Try to get an existing radio group, return null if not found */
function tryGetRadioGroup(form: ReturnType<PDFDocument['getForm']>, name: string) {
  try {
    return form.getRadioGroup(name);
  } catch {
    return null;
  }
}
