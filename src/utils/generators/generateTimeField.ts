import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export function generateTimeField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  generateTextField(field, rect, ctx, isDuplicate);
}

