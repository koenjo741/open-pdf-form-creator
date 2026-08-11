import { rgb, PDFName, PDFString, TextAlignment } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';

export function generateButtonField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext) {
  const { form, page, pdfDoc, mode } = ctx;

  if (field.buttonAction === 'saveWidget') {
    if (mode === 'readonly') return; // Do not include saveWidget in finalized PDFs

    const lang = typeof window !== 'undefined' && window.localStorage ? window.localStorage.getItem('i18nextLng') || 'de' : 'de';
    const isDe = lang.includes('de');
    
    const explainer = isDe 
      ? 'Speichern Sie das Dokument als editierbar solange noch nicht alle Felder ausgefüllt sind. Speichern Sie es als nicht-editierbar, wenn weitere Änderungen in den Feldern nicht mehr möglich sein sollen.'
      : 'Save the document as editable as long as not all fields have been filled in. Save it as not-editable when no further changes to the fields should be possible.';
    const txtEditable = isDe ? 'Speichern, editierbar' : 'Save, editable';
    const txtReadonly = isDe ? 'Speichern, nicht-editierbar' : 'Save, not-editable';

    const btnH = 30;
    const txtH = rect.height - btnH;

    // 1. Text Field
    const txtName = `${field.name}_txt`;
    const txtField = form.getFieldMaybe(txtName) ? form.getTextField(txtName) : form.createTextField(txtName);
    txtField.addToPage(page, {
      x: rect.x,
      y: rect.y + btnH,
      width: rect.width,
      height: txtH,
      borderWidth: 1,
      borderColor: rgb(0.8, 0.83, 0.88),
      backgroundColor: rgb(0.97, 0.98, 0.99),
      textColor: rgb(0.2, 0.25, 0.33),
      font: ctx.font
    });
    txtField.setText(explainer);
    txtField.enableReadOnly();
    txtField.enableMultiline();
    txtField.setAlignment(TextAlignment.Left);
    txtField.setFontSize(9);

    // 2. Editable Button
    const btnE_Name = `${field.name}_btnE`;
    const btnE = form.getFieldMaybe(btnE_Name) ? form.getButton(btnE_Name) : form.createButton(btnE_Name);
    btnE.addToPage(txtEditable, page, {
      x: rect.x,
      y: rect.y,
      width: rect.width / 2,
      height: btnH,
      borderWidth: 1,
      borderColor: rgb(0, 0.5686, 0.7176),
      backgroundColor: rgb(0.85, 0.935, 0.958),
      textColor: rgb(0, 0, 0),
      font: ctx.font
    });
    btnE.setFontSize(10);

    // 3. Readonly Button
    const btnR_Name = `${field.name}_btnR`;
    const btnR = form.getFieldMaybe(btnR_Name) ? form.getButton(btnR_Name) : form.createButton(btnR_Name);
    btnR.addToPage(txtReadonly, page, {
      x: rect.x + rect.width / 2,
      y: rect.y,
      width: rect.width / 2,
      height: btnH,
      borderWidth: 1,
      borderColor: rgb(0.0196, 0.5882, 0.4117),
      backgroundColor: rgb(0.853, 0.938, 0.912),
      textColor: rgb(0, 0, 0),
      font: ctx.font
    });
    btnR.setFontSize(10);

    // JS Actions
    const jsEdit = `app.execMenuItem("Save");`;
    const actionEdit = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsEdit) });
    const wE = btnE.acroField.getWidgets();
    if (wE.length > 0) wE[wE.length - 1].dict.set(PDFName.of('AA'), pdfDoc.context.obj({ U: actionEdit }));

    const jsReadonly = `
      for (var i = 0; i < this.numFields; i++) {
        var f = this.getField(this.getNthFieldName(i));
        if (f != null) { f.readonly = true; }
      }
      var t = this.getField("${txtName}");
      var e = this.getField("${btnE_Name}");
      var r = this.getField("${btnR_Name}");
      if(t) t.display = display.hidden;
      if(e) e.display = display.hidden;
      if(r) r.display = display.hidden;
      try { app.execMenuItem("SaveAs"); } catch(e) { app.execMenuItem("Save"); }
    `;
    const actionRead = pdfDoc.context.obj({ Type: 'Action', S: 'JavaScript', JS: PDFString.of(jsReadonly) });
    const wR = btnR.acroField.getWidgets();
    if (wR.length > 0) wR[wR.length - 1].dict.set(PDFName.of('AA'), pdfDoc.context.obj({ U: actionRead }));

    return;
  }

  // --- Normal Button Generation ---
  const existingField = form.getFieldMaybe(field.name);
  const btn = existingField ? form.getButton(field.name) : form.createButton(field.name);

  btn.addToPage(field.label || field.name || 'Senden', page, {
    ...rect,
    borderWidth: mode === 'readonly' ? 0 : 1,
    backgroundColor: rgb(0.9, 0.9, 0.9),
    textColor: rgb(0, 0, 0),
    font: ctx.font
  });

  if (field.tooltip) {
    btn.acroField.dict.set(PDFName.of('TU'), PDFString.of(field.tooltip));
  }

  if (mode === 'editable') {
    if (field.submitUrl) {
      const submitAction = pdfDoc.context.obj({
        Type: 'Action',
        S: 'SubmitForm',
        F: {
          Type: 'Filespec',
          F: PDFString.of(field.submitUrl),
          FS: PDFName.of('URL')
        },
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
