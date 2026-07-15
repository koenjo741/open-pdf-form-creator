import { PDFDocument } from 'pdf-lib';

export function tryGetRadioGroup(form: ReturnType<PDFDocument['getForm']>, name: string) {
  try { return form.getRadioGroup(name); } catch { return null; }
}

export const setNestedValue = (obj: any, keys: string[], value: any) => {
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
};

