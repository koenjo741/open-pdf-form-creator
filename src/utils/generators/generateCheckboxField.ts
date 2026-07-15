import { rgb, PDFName } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';

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
