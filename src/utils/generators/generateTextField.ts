import { TextAlignment, rgb, PDFName, PDFString } from 'pdf-lib';
import type { FieldDef } from '../../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from '../pdfJavaScriptBuilder';
import type { FieldGeneratorContext } from './types';

export function generateTextField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, pdfDoc, font, coArray, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const tf = existingField ? form.getTextField(field.name) : form.createTextField(field.name);
  tf.addToPage(page, { 
    ...rect, 
    borderWidth: mode === 'flattened' ? 0 : 1,
    backgroundColor: rgb(1, 1, 1),
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

    let validationRegex = '';
    let validationMsg = '';

    if (field.type === 'date') {
       if (field.dateFormat === 'DD.MM.YYYY') {
         validationRegex = '^(0[1-9]|[12][0-9]|3[01])\\.(0[1-9]|1[012])\\.\\d{4}$';
         validationMsg = 'Bitte ein gültiges Datum eingeben (TT.MM.JJJJ)';
       } else if (field.dateFormat === 'MM/DD/YYYY') {
         validationRegex = '^(0[1-9]|1[012])\\/(0[1-9]|[12][0-9]|3[01])\\/\\d{4}$';
         validationMsg = 'Bitte ein gültiges Datum eingeben (MM/DD/YYYY)';
       } else if (field.dateFormat === 'YYYY-MM-DD') {
         validationRegex = '^\\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$';
         validationMsg = 'Bitte ein gültiges Datum eingeben (JJJJ-MM-TT)';
       } else {
         validationRegex = '^(\\d{1,4}[./-]\\d{1,2}[./-]\\d{1,4})$';
         validationMsg = 'Bitte ein gültiges Datum eingeben';
       }
    } else if (field.type === 'text') {
       if (field.textSubType === 'email') {
         validationRegex = '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$';
         validationMsg = 'Bitte eine gültige E-Mail-Adresse eingeben';
       } else if (field.textSubType === 'number' || field.textSubType === 'currency') {
         validationRegex = '^-?\\d+([.,]\\d+)?$';
         validationMsg = 'Bitte eine gültige Zahl eingeben';
       } else if (field.textSubType === 'iban') {
         validationRegex = '^[a-zA-Z]{2}[0-9]{2}[a-zA-Z0-9]{11,30}$';
         validationMsg = 'Bitte eine gültige IBAN eingeben';
       } else if (field.textSubType === 'url') {
         validationRegex = '^(https?:\\/\\/)?([\\da-z\\.-]+)\\.([a-z\\.]{2,6})([\\/\\w \\.-]*)*\\/?$';
         validationMsg = 'Bitte eine gültige URL eingeben';
       } else if (field.textSubType === 'regex' && field.customRegex) {
         validationRegex = field.customRegex;
         validationMsg = field.regexErrorMsg || 'Ungültiges Format.';
       }
    } else if (field.type === 'time') {
       if (field.timeFormat === '12h') {
         validationRegex = '^(0?[1-9]|1[0-2]):[0-5][0-9]\\s?(AM|PM|am|pm)$';
         validationMsg = 'Bitte eine gültige Uhrzeit eingeben (HH:MM AM/PM)';
       } else {
         validationRegex = '^([01]?[0-9]|2[0-3]):[0-5][0-9]$';
         validationMsg = 'Bitte eine gültige Uhrzeit eingeben (HH:MM)';
       }
    }

    if (validationRegex) {
      const jsCode = buildValidationJavaScript(validationRegex, validationMsg);
      const jsAction = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsCode) });
      getOrCreateAA().set(PDFName.of('V'), jsAction);
    }
  }

  try { tf.updateAppearances(font); } catch (e) { console.warn(`[PDF] updateAppearances failed for "${field.name}":`, e); }
}
