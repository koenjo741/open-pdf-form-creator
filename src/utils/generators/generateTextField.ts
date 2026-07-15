import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from '../tableExportUtils';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup, setNestedValue } from './utils';

export function generateTextField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, pdfDoc, font, coArray, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const tf = existingField ? form.getTextField(field.name) : form.createTextField(field.name);
  tf.addToPage(page, { 
    ...rect, 
    borderWidth: mode === 'flattened' ? 0 : 1,
    backgroundColor: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.62, 0.75, 0.98),
  });

  if (isDuplicate) {
    const widgets = tf.acroField.getWidgets();
    if (widgets.length > 0) {
      const newWidget = widgets[widgets.length - 1];
      newWidget.setFlags(newWidget.getFlags() | 64); // ReadOnly (bit 7)
    }
  } else {
    tf.setFontSize(field.fontSize ?? 12);
    tf.disableMultiline();

    if (field.textAlign === 'center') tf.setAlignment(TextAlignment.Center);
    else if (field.textAlign === 'right') tf.setAlignment(TextAlignment.Right);
    else tf.setAlignment(TextAlignment.Left);

    if (field.value) tf.setText(field.value);

    if (field.isRequired) tf.enableRequired();
    else tf.disableRequired();

    let aaDict: any = null;
    const getOrCreateAA = () => {
      if (!aaDict) {
        aaDict = pdfDoc.context.obj({});
        tf.acroField.dict.set(PDFName.of('AA'), aaDict);
      }
      return aaDict;
    };

    if (field.calculation) {
      const isNumber = field.textSubType === 'number';
      const jsCode = buildCalculationJavaScript(field.calculation, isNumber);
      const jsAction = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsCode) });
      getOrCreateAA().set(PDFName.of('C'), jsAction);
      coArray.push(tf.acroField.ref);
    }

    if (field.textSubType === 'regex' && field.customRegex) {
      const jsCode = buildValidationJavaScript(field.customRegex, field.regexErrorMsg);
      const jsAction = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsCode) });
      getOrCreateAA().set(PDFName.of('V'), jsAction);
    }
  }

  try { tf.updateAppearances(font); } catch { /* ignore */ }
}

