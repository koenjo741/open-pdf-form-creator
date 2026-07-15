import { rgb } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';

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
