import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export function generateYesNoField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, mode } = ctx;
  const groupName = field.name;
  let radioGroup = tryGetRadioGroup(form, groupName);
  if (!radioGroup) radioGroup = form.createRadioGroup(groupName);

  const btnWidth = 14;
  const btnHeight = 14;
  
  // Layout logic: We have 2 buttons. We can space them out evenly within the rect.
  const spacing = (rect.width - (2 * btnWidth)) / 3;
  
  // Option 1: Yes
  const yesX = rect.x + spacing;
  const yesY = rect.y + (rect.height - btnHeight) / 2;
  radioGroup.addOptionToPage('Yes', page, { 
    x: yesX, y: yesY, width: btnWidth, height: btnHeight,
    borderWidth: mode === 'flattened' ? 0 : 1 
  });

  // Option 2: No
  const noX = yesX + btnWidth + spacing;
  const noY = yesY;
  radioGroup.addOptionToPage('No', page, { 
    x: noX, y: noY, width: btnWidth, height: btnHeight,
    borderWidth: mode === 'flattened' ? 0 : 1 
  });

  if (field.value) {
    try { radioGroup.select(field.value); } catch { /* ignore */ }
  }
  
  if (field.isRequired) radioGroup.enableRequired();
  else radioGroup.disableRequired();

  try { radioGroup.updateAppearances(); } catch { /* ignore */ }
}

