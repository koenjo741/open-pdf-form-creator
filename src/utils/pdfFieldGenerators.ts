import { PDFDocument, PDFPage, PDFFont, TextAlignment, rgb, PDFName, PDFString, PDFArray } from 'pdf-lib';
import type { FieldDef, ExportMode } from '../types';
import { buildCalculationJavaScript, buildValidationJavaScript } from './pdfJavaScriptBuilder';
import bwipjs from 'bwip-js/browser';
import { formatTableValues } from './tableExportUtils';

export interface FieldGeneratorContext {
  form: ReturnType<PDFDocument['getForm']>;
  page: PDFPage;
  pdfDoc: PDFDocument;
  font: PDFFont;
  coArray: PDFArray;
  mode: ExportMode;
  allFields: FieldDef[];
}

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

export function generateDropdownField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, font, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const dd = existingField ? form.getDropdown(field.name) : form.createDropdown(field.name);
  dd.addToPage(page, { 
    ...rect, 
    borderWidth: mode === 'flattened' ? 0 : 1,
    backgroundColor: rgb(0.92, 0.95, 0.99),
    borderColor: rgb(0.62, 0.75, 0.98),
  });

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

export function generateCheckboxField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
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

export async function generateBarcodeField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { page, pdfDoc, mode, allFields } = ctx;
  if (mode === 'flattened') {
    try {
      const formData: Record<string, any> = {};
      for (const f of allFields) {
        if (f.type === 'scribble' || f.type === 'signature' || f.type === 'barcode') continue;
        if (f.type === 'checkbox') {
          formData[f.name] = f.checked ?? f.checkedByDefault ?? false;
        } else if (f.type === 'radio') {
          if (f.checked) formData[f.groupName || f.name] = f.radioValue || f.value;
        } else if (f.type === 'inputTable') {
          formData[f.name] = formatTableValues(f);
        } else {
          formData[f.name] = f.value || '';
        }
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

export function generateButtonField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, pdfDoc, mode } = ctx;
  const existingField = form.getFieldMaybe(field.name);
  const btn = existingField ? form.getButton(field.name) : form.createButton(field.name);

  btn.addToPage(field.label || field.name || (field.buttonAction === 'lock' ? 'Sperren' : 'Senden'), page, {
    ...rect,
    borderWidth: mode === 'flattened' ? 0 : 1,
    backgroundColor: rgb(0.9, 0.9, 0.9),
    textColor: rgb(0, 0, 0)
  });

  if (field.tooltip) {
    btn.acroField.dict.set(PDFName.of('TU'), PDFString.of(field.tooltip));
  }

  if (mode === 'editable') {
    if (field.buttonAction === 'lock') {
      const jsCode = `
        for (var i = 0; i < this.numFields; i++) {
          var f = this.getField(this.getNthFieldName(i));
          if (f != null) { f.readonly = true; }
        }
        event.target.userName = "";
        event.target.display = display.hidden;
        try {
          app.execMenuItem("SaveAs");
        } catch(e) {
          app.execMenuItem("Save");
        }
      `;
      const lockAction = pdfDoc.context.obj({
        Type: 'Action',
        S: 'JavaScript',
        JS: PDFString.of(jsCode)
      });
      const widgets = btn.acroField.getWidgets();
      if (widgets.length > 0) {
        const widget = widgets[widgets.length - 1];
        const aaDict = pdfDoc.context.obj({ U: lockAction }); // Mouse Up
        widget.dict.set(PDFName.of('AA'), aaDict);
      }
    } else if (field.submitUrl) {
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
}

export function generateTimeField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  generateTextField(field, rect, ctx, isDuplicate);
}

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

export function generateInputTableField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, mode } = ctx;
  const rows = field.tableRows || ['Row 1', 'Row 2'];
  const cols = field.tableCols || ['Col 1', 'Col 2'];
  const inputType = field.tableInputType || 'radio';

  const numRows = rows.length;
  const numCols = cols.length;
  
  const totalColUnits = numCols + 2;
  const colUnitWidth = rect.width / totalColUnits;
  
  const rowHeight = rect.height / (numRows + 1);

  for (let r = 0; r < numRows; r++) {
    let radioGroup: any = null;
    if (inputType === 'radio') {
      const groupName = `${field.name}_R${r}`;
      radioGroup = tryGetRadioGroup(form, groupName) || form.createRadioGroup(groupName);
    }

    for (let c = 0; c < numCols; c++) {
      const cellX = rect.x + (2 * colUnitWidth) + (c * colUnitWidth);
      const cellY = rect.y + rect.height - ((r + 2) * rowHeight);

      const widgetSize = inputType === 'textbox' ? Math.min(rowHeight - 4, 16) : 12;
      const widgetX = cellX + (colUnitWidth - (inputType === 'textbox' ? colUnitWidth - 4 : widgetSize)) / 2;
      const widgetY = cellY + (rowHeight - widgetSize) / 2;
      const widgetW = inputType === 'textbox' ? colUnitWidth - 4 : widgetSize;
      const widgetH = widgetSize;

      const cellRect = { x: widgetX, y: widgetY, width: widgetW, height: widgetH };
      const cellName = `${field.name}_R${r}_C${c}`;

      if (inputType === 'radio' && radioGroup) {
        radioGroup.addOptionToPage(`Col${c}`, page, { ...cellRect, borderWidth: mode === 'flattened' ? 0 : 1 });
      } else if (inputType === 'checkbox') {
        const cb = form.getFieldMaybe(cellName) ? form.getCheckBox(cellName) : form.createCheckBox(cellName);
        cb.addToPage(page, { ...cellRect, borderWidth: mode === 'flattened' ? 0 : 1 });
        if (field.tableValues?.[`r${r}_c${c}`]) {
          try { cb.check(); } catch { /* ignore */ }
        }
      } else if (inputType === 'textbox') {
        const tf = form.getFieldMaybe(cellName) ? form.getTextField(cellName) : form.createTextField(cellName);
        tf.addToPage(page, { ...cellRect, borderWidth: mode === 'flattened' ? 0 : 1 });
        const val = field.tableValues?.[`r${r}_c${c}`];
        if (val) {
          try { tf.setText(String(val)); } catch { /* ignore */ }
        }
      }
    }
    
    if (inputType === 'radio' && radioGroup) {
      const selectedCol = field.tableValues?.[`r${r}`];
      if (selectedCol !== undefined) {
        try { radioGroup.select(`Col${selectedCol}`); } catch { /* ignore */ }
      }
      try { radioGroup.updateAppearances(); } catch { /* ignore */ }
    }
  }

  // Draw Grid and Text
  const { rgb } = require('pdf-lib');
  const lineColor = rgb(0.8, 0.8, 0.8);
  const textColor = rgb(0.2, 0.2, 0.2);
  const fontSize = field.fontSize || 9;

  // Background for header row (optional, skip for now to keep it clean)

  // Draw Horizontal Lines
  for (let i = 0; i <= numRows + 1; i++) {
    const lineY = rect.y + rect.height - (i * rowHeight);
    page.drawLine({
      start: { x: rect.x, y: lineY },
      end: { x: rect.x + rect.width, y: lineY },
      thickness: 0.5,
      color: lineColor,
    });
  }

  // Draw Vertical Lines
  page.drawLine({
    start: { x: rect.x, y: rect.y },
    end: { x: rect.x, y: rect.y + rect.height },
    thickness: 0.5,
    color: lineColor,
  });
  
  page.drawLine({
    start: { x: rect.x + (2 * colUnitWidth), y: rect.y },
    end: { x: rect.x + (2 * colUnitWidth), y: rect.y + rect.height },
    thickness: 0.5,
    color: lineColor,
  });

  for (let c = 1; c <= numCols; c++) {
    const lineX = rect.x + (2 * colUnitWidth) + (c * colUnitWidth);
    page.drawLine({
      start: { x: lineX, y: rect.y },
      end: { x: lineX, y: rect.y + rect.height },
      thickness: 0.5,
      color: lineColor,
    });
  }

  // Draw Column Headers
  for (let c = 0; c < numCols; c++) {
    const colName = cols[c];
    const textWidth = ctx.font.widthOfTextAtSize(colName, fontSize);
    const textX = rect.x + (2 * colUnitWidth) + (c * colUnitWidth) + (colUnitWidth - textWidth) / 2;
    const textY = rect.y + rect.height - rowHeight + (rowHeight - fontSize) / 2;
    page.drawText(colName, {
      x: textX,
      y: textY,
      size: fontSize,
      font: ctx.font,
      color: textColor,
    });
  }

  // Draw Row Headers
  for (let r = 0; r < numRows; r++) {
    const rowName = rows[r];
    const textY = rect.y + rect.height - ((r + 2) * rowHeight) + (rowHeight - fontSize) / 2;
    page.drawText(rowName, {
      x: rect.x + 2, // Small padding
      y: textY,
      size: fontSize,
      font: ctx.font,
      color: textColor,
    });
  }
}
