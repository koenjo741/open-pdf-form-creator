import { useState } from 'react';
import { PDFDocument, PDFName, PDFBool, PDFString, StandardFonts } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { useEditorStore } from '../store/useEditorStore';
import { loadInterRegular, loadInterBold } from '../utils/fontLoader';
import { toast } from '../components/common/Toast';
import type { ExportMode } from '../types';
import { saveFileWithPicker } from '../utils/fileSystem';
import { buildConditionalLogicJavaScript } from '../utils/pdfJavaScriptBuilder';
import {
  generateTextField,
  generateDropdownField,
  generateCheckboxField,
  generateRadioField,
  generateSignatureField,
  generateScribbleField,
  generateBarcodeField,
  generateButtonField,
  generateTimeField,
  generateScaleRatingField,
  generateInputTableField,
  generateYesNoField,
  type FieldGeneratorContext
} from '../utils/pdfFieldGenerators';

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

  const exportPdfBuffer = async (mode: ExportMode, readOnlyFieldNames?: string[]): Promise<Uint8Array | null> => {
    if (!pdfBuffer || pdfBuffer.length === 0) {
      toast.error('No PDF loaded.');
      return null;
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
        return null;
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

          const ctx: FieldGeneratorContext = {
            form, page, pdfDoc, font, coArray, mode, allFields: fields
          };

          try {
            const isDuplicate = !!form.getFieldMaybe(field.name);

            switch (field.type) {
              case 'text':
              case 'date':
                generateTextField(field, rect, ctx, isDuplicate);
                break;
              case 'time':
                generateTimeField(field, rect, ctx, isDuplicate);
                break;
              case 'dropdown':
                generateDropdownField(field, rect, ctx, isDuplicate);
                break;
              case 'checkbox':
                generateCheckboxField(field, rect, ctx, isDuplicate);
                break;
              case 'radio':
                generateRadioField(field, rect, ctx);
                break;
              case 'scaleRating':
                generateScaleRatingField(field, rect, ctx);
                break;
              case 'inputTable':
                generateInputTableField(field, rect, ctx);
                break;
              case 'yesNo':
                generateYesNoField(field, rect, ctx);
                break;
              case 'signature':
                generateSignatureField(field, rect, ctx);
                break;
              case 'scribble':
                await generateScribbleField(field, rect, ctx);
                break;
              case 'barcode':
                await generateBarcodeField(field, rect, ctx);
                break;
              case 'button':
                generateButtonField(field, rect, ctx);
                break;
            }
        } catch (fieldErr) {
          console.warn(`[PDF Export] Could not add field "${field.name}":`, fieldErr);
        }
      }

      if (readOnlyFieldNames && readOnlyFieldNames.length > 0) {
        readOnlyFieldNames.forEach(name => {
          const field = form.getFieldMaybe(name);
          if (field) {
            field.enableReadOnly();
          }
        });
      }

      // 6.5 Add Conditional Logic Script
      const conditionJs = buildConditionalLogicJavaScript(sortedFields);

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
