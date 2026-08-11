import { TextAlignment, rgb } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';

export function generateTextareaField(field: FieldDef, rect: { x: number, y: number, width: number, height: number }, ctx: FieldGeneratorContext, isDuplicate: boolean) {
  const { form, page, font, mode } = ctx;
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
    tf.enableMultiline();

    if (field.textAlign === 'center') tf.setAlignment(TextAlignment.Center);
    else if (field.textAlign === 'right') tf.setAlignment(TextAlignment.Right);
    else tf.setAlignment(TextAlignment.Left);

    if (field.value) tf.setText(field.value);

    if (field.isRequired) tf.enableRequired();
    else tf.disableRequired();
  }

  try { tf.updateAppearances(font); } catch (e) { console.warn(`[PDF] updateAppearances failed for "${field.name}":`, e); }
}
