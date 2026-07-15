import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export async function generateBarcodeField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { page, pdfDoc, mode, allFields } = ctx;
  if (mode === 'flattened') {
    try {
      const formData: Record<string, any> = {};
      for (const f of allFields) {
        if (f.type === 'scribble' || f.type === 'signature' || f.type === 'barcode') continue;
        if (f.type === 'checkbox') {
          formData[f.name] = f.checked ?? f.checkedByDefault ?? false;
        } else if (f.type === 'radio') {
          if (f.checked) formData[f.groupName || f.name] = f.radioValue || f.value;
        } else if (f.type === 'inputTable') {
          formData[f.name] = formatTableValues(f);
        } else {
          formData[f.name] = f.value || '';
        }
      }

      const jsonString = JSON.stringify(formData);
      const canvas = document.createElement('canvas');
      bwipjs.toCanvas(canvas, {
        bcid: (field as any).barcodeType === 'pdf417' ? 'pdf417' : 'qrcode',
        text: jsonString, scale: 3, includetext: false,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const imgBytes = Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));
      const embeddedImg = await pdfDoc.embedPng(imgBytes);

      const scale = Math.min(rect.width / embeddedImg.width, rect.height / embeddedImg.height);
      const drawWidth = embeddedImg.width * scale;
      const drawHeight = embeddedImg.height * scale;
      const drawX = rect.x + (rect.width - drawWidth) / 2;
      const drawY = rect.y + (rect.height - drawHeight) / 2;

      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
    } catch (err) {
      console.error('Failed to generate barcode for PDF export:', err);
      throw err;
    }
  } else {
    page.drawRectangle({
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
    });
  }
}

