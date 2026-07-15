import { rgb, PDFName, PDFString } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';

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
