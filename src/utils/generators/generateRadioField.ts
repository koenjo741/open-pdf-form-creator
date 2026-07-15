import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export function generateRadioField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, mode } = ctx;
  const groupName = field.groupName ?? field.name;
  let radioGroup = tryGetRadioGroup(form, groupName);
  if (!radioGroup) radioGroup = form.createRadioGroup(groupName);

  const optionValue = field.radioValue ?? field.id.slice(0, 8);
  radioGroup.addOptionToPage(optionValue, page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });

  if (field.value === optionValue) radioGroup.select(optionValue);
  else if (!field.value && field.checkedByDefault) radioGroup.select(optionValue);

  if (field.isRequired) radioGroup.enableRequired();
  else radioGroup.disableRequired();

  try { radioGroup.updateAppearances(); } catch { /* ignore */ }
}

