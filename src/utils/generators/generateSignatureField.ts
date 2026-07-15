import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export function generateSignatureField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, pdfDoc, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  if (mode === 'flattened') {
    page.drawRectangle({
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
      borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 1,
    });
  } else {
    if (!existingField) {
      const signatureDict = pdfDoc.context.obj({
        Type: 'Annot', Subtype: 'Widget', FT: 'Sig',
        Rect: [rect.x, rect.y, rect.x + rect.width, rect.y + rect.height],
        T: PDFString.of(field.name), F: 4, P: page.ref,
      });
      const signatureRef = pdfDoc.context.register(signatureDict);
      page.node.addAnnot(signatureRef);
      form.acroForm.addField(signatureRef);
    }
  }
}

