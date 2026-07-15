import { PDFDocument, PDFPage, PDFFont, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';

export interface FieldGeneratorContext {
  form: ReturnType<PDFDocument['getForm']>;
  page: PDFPage;
  pdfDoc: PDFDocument;
  font: PDFFont;
  coArray: PDFArray;
  mode: ExportMode;
  allFields: FieldDef[];
}

