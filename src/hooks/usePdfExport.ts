import { useState } from 'react';
import { PDFDocument, PDFName, PDFBool, PDFString, StandardFonts, TextAlignment, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { saveAs } from 'file-saver';
import { useEditorStore } from '../store/useEditorStore';
import { loadInterRegular, loadInterBold } from '../utils/fontLoader';
import { toast } from '../components/common/Toast';
import type { ExportMode } from '../types';
import bwipjs from 'bwip-js/browser';

import { saveFileWithPicker } from '../utils/fileSystem';

async function triggerDownload(bytes: Uint8Array, filename: string) {
  await saveFileWithPicker(bytes, filename, 'PDF Document', { 'application/pdf': ['.pdf'] });
}

/** Generate a safe output filename */
function buildFilename(original: string | null, mode: ExportMode): string {
  const base = original?.replace(/\.pdf$/i, '') ?? 'document';
  return mode === 'editable' ? `${base}__editable.pdf` : `${base}__finalized.pdf`;
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);
  const { pdfBuffer, fields, pdfFileName } = useEditorStore();

  const exportPdfBuffer = async (mode: ExportMode): Promise<Uint8Array | null> => {
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
                
                // Setup AA (Additional Actions) dictionary if needed
                let aaDict: any = null;
                const getOrCreateAA = () => {
                  if (!aaDict) {
                    aaDict = pdfDoc.context.obj({});
                    tf.acroField.dict.set(PDFName.of('AA'), aaDict);
                  }
                  return aaDict;
                };

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
                  
                  getOrCreateAA().set(PDFName.of('C'), jsAction);
                  coArray.push(tf.acroField.ref);
                }

                // Handle Regex validation
                if (field.textSubType === 'regex' && field.customRegex) {
                  // Escape backslashes and double quotes for PDF JavaScript string literal
                  const safeRegex = field.customRegex.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                  const errorMsg = (field.regexErrorMsg || 'Ungültiges Format.').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
                  const jsCode = `
var re = new RegExp("${safeRegex}");
if (event.value && !re.test(event.value)) {
  app.alert("${errorMsg}");
  event.rc = false;
}
`;
                  const jsAction = pdfDoc.context.obj({
                    Type: 'Action',
                    S: 'JavaScript',
                    JS: PDFString.of(jsCode)
                  });
                  
                  getOrCreateAA().set(PDFName.of('V'), jsAction);
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
              cb.addToPage(page, { 
                ...rect, 
                borderWidth: mode === 'flattened' ? 0 : 3,
                borderColor: rgb(0.15, 0.15, 0.15),
                textColor: rgb(0.086, 0.64, 0.29)
              });
              
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
            case 'signature': {
              if (mode === 'flattened') {
                // Flattened mode: Signature fields don't make sense as interactive elements,
                // but we might want to draw a placeholder or just ignore them.
                // Let's just draw a light gray box with text so it's visible.
                page.drawRectangle({
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  borderColor: rgb(0.8, 0.8, 0.8), // Light gray
                  borderWidth: 1,
                });
              } else {
                if (!existingField) {
                  // Manual signature field creation because pdf-lib doesn't have createSignature() yet
                  const signatureDict = pdfDoc.context.obj({
                    Type: 'Annot',
                    Subtype: 'Widget',
                    FT: 'Sig',
                    Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
                    T: PDFString.of(field.name),
                    F: 4, // Print flag
                    P: page.ref,
                  });
                  const signatureRef = pdfDoc.context.register(signatureDict);
                  page.node.addAnnot(signatureRef);
                  form.acroForm.addField(signatureRef);
                } else {
                  // If it already exists, we could theoretically update its Rect, but getSignature() is read-only in terms of adding to page
                  // Usually, fields aren't duplicated for signatures, but if so, we can just leave the original.
                }
              }
              break;
            }
            case 'scribble': {
              // If there's a signature image, draw it
              if (field.value && field.value.startsWith('data:image/')) {
                // Extract base64
                const isPng = field.value.startsWith('data:image/png');
                const isJpg = field.value.startsWith('data:image/jpeg');
                if (isPng || isJpg) {
                  const imgDataUrl = field.value;
                  const imgBytes = Uint8Array.from(atob(imgDataUrl.split(',')[1]), c => c.charCodeAt(0));
                  const embeddedImg = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
                  
                  // Scale proportionally to fit within rect (like object-fit: contain)
                  const imgWidth = embeddedImg.width;
                  const imgHeight = embeddedImg.height;
                  const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight);
                  
                  const drawWidth = imgWidth * scale;
                  const drawHeight = imgHeight * scale;
                  const drawX = rect.x + (rect.width - drawWidth) / 2;
                  const drawY = rect.y + (rect.height - drawHeight) / 2;

                  page.drawImage(embeddedImg, {
                    x: drawX,
                    y: drawY,
                    width: drawWidth,
                    height: drawHeight,
                  });
                }
              } else if (mode === 'editable') {
                // If there's no image and mode is editable, render a gray box so the user sees where to place their signature in Acrobat
                page.drawRectangle({
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  color: rgb(0.95, 0.95, 0.95), // Very light gray fill
                  borderColor: rgb(0.8, 0.8, 0.8),
                  borderWidth: 1,
                });
              }
              break;
            }
            case 'barcode': {
              if (mode === 'flattened') {
                try {
                  // Gather all field data, excluding scribble, signature and the barcode itself
                  const formData: Record<string, any> = {};
                  for (const f of fields) {
                    if (f.type === 'scribble' || f.type === 'signature' || f.type === 'barcode') {
                      continue;
                    }
                    if (f.type === 'checkbox') formData[f.name] = f.checked ?? f.checkedByDefault ?? false;
                    else if (f.type === 'radio') {
                      if (f.checked) formData[f.groupName || f.name] = f.radioValue || f.value;
                    }
                    else formData[f.name] = f.value || '';
                  }
                  
                  const jsonString = JSON.stringify(formData);
                  
                  // Generate barcode using bwip-js
                  const canvas = document.createElement('canvas');
                  bwipjs.toCanvas(canvas, {
                    bcid: field.barcodeFormat === 'pdf417' ? 'pdf417' : 'qrcode',
                    text: jsonString,
                    scale: 3, 
                    includetext: false,
                  });
                  
                  const dataUrl = canvas.toDataURL('image/png');
                  const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
                  const embeddedImg = await pdfDoc.embedPng(imgBytes);
                  
                  const imgWidth = embeddedImg.width;
                  const imgHeight = embeddedImg.height;
                  const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight);
                  
                  const drawWidth = imgWidth * scale;
                  const drawHeight = imgHeight * scale;
                  const drawX = rect.x + (rect.width - drawWidth) / 2;
                  const drawY = rect.y + (rect.height - drawHeight) / 2;

                  page.drawImage(embeddedImg, {
                    x: drawX,
                    y: drawY,
                    width: drawWidth,
                    height: drawHeight,
                  });
                } catch (err) {
                  console.error('Failed to generate barcode for PDF export:', err);
                  toast.error(`Barcode konnte nicht generiert werden: ${err}`);
                }
              } else {
                // In editable mode, just draw a placeholder box
                page.drawRectangle({
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height,
                  color: rgb(0.95, 0.95, 0.95),
                  borderColor: rgb(0.8, 0.8, 0.8),
                  borderWidth: 1,
                });
              }
              break;
            }
          }
        } catch (fieldErr) {
          console.warn(`[PDF Export] Could not add field "${field.name}":`, fieldErr);
        }
      }

      // 6.5 Add Conditional Logic Script
      let conditionJs = '';
      for (const field of sortedFields) {
        if (field.enableCondition) {
          const ctrlField = sortedFields.find(f => f.id === field.enableCondition!.targetFieldId);
          if (ctrlField && ctrlField.name && field.name) {
            const ctrlName = ctrlField.name;
            const depName = field.name;
            const idSafe = field.id.replace(/-/g, '');
            if (field.enableCondition.condition === 'isChecked') {
              conditionJs += `
var ctrl_${idSafe} = this.getField("${ctrlName}");
var dep_${idSafe} = this.getField("${depName}");
if (ctrl_${idSafe} && dep_${idSafe}) {
  if (ctrl_${idSafe}.value === "Off") {
    dep_${idSafe}.readonly = true;
    dep_${idSafe}.fillColor = ["G", 0.9];
  } else {
    dep_${idSafe}.readonly = false;
    dep_${idSafe}.fillColor = ["T"];
  }
}
`;
            } else {
              const val = field.enableCondition.value || '';
              conditionJs += `
var ctrl_${idSafe} = this.getField("${ctrlName}");
var dep_${idSafe} = this.getField("${depName}");
if (ctrl_${idSafe} && dep_${idSafe}) {
  if (ctrl_${idSafe}.value !== "${val}") {
    dep_${idSafe}.readonly = true;
    dep_${idSafe}.fillColor = ["G", 0.9];
  } else {
    dep_${idSafe}.readonly = false;
    dep_${idSafe}.fillColor = ["T"];
  }
}
`;
            }
          }
        }
      }

      if (conditionJs && mode === 'editable') {
        try {
          const hiddenTf = form.createTextField('_OPEN_PDF_CONDITIONS_');
          hiddenTf.acroField.getWidgets()[0].setFlags(2); // Hidden
          const jsAction = pdfDoc.context.obj({
            Type: 'Action',
            S: 'JavaScript',
            JS: PDFString.of(conditionJs)
          });
          const aaDict = pdfDoc.context.obj({ C: jsAction });
          hiddenTf.acroField.dict.set(PDFName.of('AA'), aaDict);
          coArray.push(hiddenTf.acroField.ref);
          
          // Execute the same script on open to initialize the state
          pdfDoc.catalog.set(PDFName.of('OpenAction'), jsAction);
        } catch (e) {
          console.warn('[PDF Export] Could not add conditional logic field:', e);
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

      // 8. Save
      const rawBytes = await pdfDoc.save();
      return rawBytes;
    } catch (err) {
      console.error('[PDF Export]', err);
      toast.error('PDF generation failed. Check the console for details.');
      return null;
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdf = async (mode: ExportMode) => {
    const rawBytes = await exportPdfBuffer(mode);
    if (rawBytes) {
      await triggerDownload(rawBytes, buildFilename(pdfFileName, mode));
      toast.success(mode === 'editable' ? 'Editable PDF downloaded!' : 'Finalized PDF downloaded!');
    }
  };

  return { exportPdf, exportPdfBuffer, isExporting };
}

/** Try to get an existing radio group, return null if not found */
function tryGetRadioGroup(form: ReturnType<PDFDocument['getForm']>, name: string) {
  try {
    return form.getRadioGroup(name);
  } catch {
    return null;
  }
}
