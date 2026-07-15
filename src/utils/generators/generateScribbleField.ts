import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export async function generateScribbleField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { page, pdfDoc, mode } = ctx;
  if (field.value && field.value.startsWith('data:image/')) {
    const isPng = field.value.startsWith('data:image/png');
    const isJpg = field.value.startsWith('data:image/jpeg');
    if (isPng || isJpg) {
      const imgBytes = Uint8Array.from(atob(field.value.split(',')[1]), c => c.charCodeAt(0));
      const embeddedImg = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);

      const scale = Math.min(rect.width / embeddedImg.width, rect.height / embeddedImg.height);
      const drawWidth = embeddedImg.width * scale;
      const drawHeight = embeddedImg.height * scale;
      const drawX = rect.x + (rect.width - drawWidth) / 2;
      const drawY = rect.y + (rect.height - drawHeight) / 2;

      page.drawImage(embeddedImg, { x: drawX, y: drawY, width: drawWidth, height: drawHeight });
    }
  } else if (mode === 'editable') {
    page.drawRectangle({
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
    });
  }
}

