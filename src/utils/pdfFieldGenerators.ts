import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from './pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';

export interface FieldGeneratorContext {
  form: ReturnType<PDFDocument['getForm']>;
  page: PDFPage;
  pdfDoc: PDFDocument;
  font: PDFFont;
  coArray: PDFArray;
  mode: ExportMode;
  allFields: FieldDef[];
}

export function generateTextField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, pdfDoc, font, coArray, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const tf = existingField ? form.getTextField(field.name) : form.createTextField(field.name);
  tf.addToPage(page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
  
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

export function generateDropdownField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, font, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const dd = existingField ? form.getDropdown(field.name) : form.createDropdown(field.name);
  dd.addToPage(page, { ...rect, borderWidth: mode === 'flattened' ? 0 : 1 });
  
  if (isDuplicate) {
    const widgets = dd.acroField.getWidgets();
    if (widgets.length > 0) {
      const newWidget = widgets[widgets.length - 1];
      newWidget.setFlags(newWidget.getFlags() | 64);
    }
  } else {
    dd.setFontSize(field.fontSize ?? 12);
    if (field.options && field.options.length > 0) {
      dd.setOptions(field.options);
      if (field.value && field.options.includes(field.value)) dd.select(field.value);
      else if (field.defaultOption && field.options.includes(field.defaultOption)) dd.select(field.defaultOption);
    }
    if (field.isRequired) dd.enableRequired();
    else dd.disableRequired();
  }
  try { dd.updateAppearances(font); } catch { /* ignore */ }
}

export function generateCheckboxField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const cb = existingField ? form.getCheckBox(field.name) : form.createCheckBox(field.name);
  cb.addToPage(page, { 
    ...rect, 
    borderWidth: mode === 'flattened' ? 0 : 3,
    borderColor: rgb(0.15, 0.15, 0.15),
    textColor: rgb(0.086, 0.64, 0.29)
  });
  
  if (isDuplicate) {
    const widgets = cb.acroField.getWidgets();
    if (widgets.length > 0) {
      const newWidget = widgets[widgets.length - 1];
      newWidget.setFlags(newWidget.getFlags() | 64);
    }
  } else {
    if (field.checked !== undefined) {
      if (field.checked) cb.check();
    } else if (field.checkedByDefault) {
      cb.check();
    }
    if (field.isRequired) cb.enableRequired();
    else cb.disableRequired();
  }
  try { (cb as unknown as { updateAppearances: () => void }).updateAppearances(); } catch { /* ignore */ }
}

function tryGetRadioGroup(form: ReturnType<PDFDocument['getForm']>, name: string) {
  try { return form.getRadioGroup(name); } catch { return null; }
}

export function generateRadioField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext) {
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

export function generateSignatureField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext) {
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

export async function generateScribbleField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext) {
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

export async function generateBarcodeField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext) {
  const { page, pdfDoc, mode, allFields } = ctx;
  if (mode === 'flattened') {
    try {
      const formData: Record<string, any> = {};
      for (const f of allFields) {
        if (f.type === 'scribble' || f.type === 'signature' || f.type === 'barcode') continue;
        if (f.type === 'checkbox') formData[f.name] = f.checked ?? f.checkedByDefault ?? false;
        else if (f.type === 'radio') {
          if (f.checked) formData[f.groupName || f.name] = f.radioValue || f.value;
        } else formData[f.name] = f.value || '';
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

export function generateButtonField(field: FieldDef, rect: {x:number, y:number, width:number, height:number}, ctx: FieldGeneratorContext) {
  const { form, page, pdfDoc, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const btn = existingField ? form.getButton(field.name) : form.createButton(field.name);
  
  btn.addToPage(field.label || field.name || 'Senden', page, {
    ...rect,
    borderWidth: mode === 'flattened' ? 0 : 1,
    backgroundColor: rgb(0.9, 0.9, 0.9),
    textColor: rgb(0, 0, 0)
  });

  if (mode === 'editable' && field.submitUrl) {
    const submitAction = pdfDoc.context.obj({
      Type: 'Action',
      S: 'SubmitForm',
      F: {
        Type: 'Filespec',
        F: PDFString.of(field.submitUrl),
        FS: PDFName.of('URL')
      },
      // Flags (bit 3 = ExportFormat (HTML), bit 1 = Include/Exclude, bit 2 = IncludeNoValueFields)
      // We'll set Flags to 0 (FDF) or 4 (HTML format) or 256 (Submit PDF). 
      // Most generic is HTML format (bit 3) which sends form data as POST
      Flags: 4
    });

    const widgets = btn.acroField.getWidgets();
    if (widgets.length > 0) {
      const widget = widgets[widgets.length - 1];
      widget.dict.set(PDFName.of('A'), submitAction);
    }
  }
}
