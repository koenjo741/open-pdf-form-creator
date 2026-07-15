import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';
import { generateTextField } from './generateTextField';

export function generateScaleRatingField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, mode } = ctx;
  const groupName = field.name;
  let radioGroup = tryGetRadioGroup(form, groupName);
  if (!radioGroup) radioGroup = form.createRadioGroup(groupName);

  const min = field.scaleMin || 1;
  const max = field.scaleMax || 5;
  const optionsCount = max - min + 1;
  
  if (optionsCount <= 0) return;

  const btnWidth = 16;
  const btnHeight = 16;
  const availableWidth = rect.width - (optionsCount * btnWidth);
  const spacing = optionsCount > 1 ? availableWidth / (optionsCount - 1) : 0;

  for (let i = 0; i < optionsCount; i++) {
    const val = String(min + i);
    const optionX = rect.x + i * (btnWidth + spacing);
    const optionY = rect.y + (rect.height - btnHeight) / 2;
    
    radioGroup.addOptionToPage(val, page, { 
      x: optionX, y: optionY, width: btnWidth, height: btnHeight,
      borderWidth: mode === 'flattened' ? 0 : 1 
    });
  }

  if (field.value) {
    try { radioGroup.select(field.value); } catch { /* ignore */ }
  }
  
  if (field.isRequired) radioGroup.enableRequired();
  else radioGroup.disableRequired();

  try { radioGroup.updateAppearances(); } catch { /* ignore */ }
}

