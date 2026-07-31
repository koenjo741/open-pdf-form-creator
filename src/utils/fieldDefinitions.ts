import type { FieldDef, ToolMode } from '../types';

export const DEFAULT_SIZES: Record<string, { w: number; h: number }> = {
  text:        { w: 120, h: 24 },
  dropdown:    { w: 100, h: 24 },
  date:        { w: 120, h: 24 },
  time:        { w: 100, h: 24 },
  scaleRating: { w: 250, h: 50 },
  inputTable:  { w: 350, h: 150 },
  yesNo:       { w: 120, h: 30 },
  checkbox:    { w: 16,  h: 16 },
  radio:       { w: 16,  h: 16 },
  signature:   { w: 150, h: 50 },
  scribble:    { w: 150, h: 50 },
  barcode:     { w: 100, h: 100 },
  button:      { w: 120, h: 36 },
};

export function createNewField(
  activeTool: ToolMode,
  fields: FieldDef[],
  pageIndex: number,
  pdfX: number,
  pdfY: number,
  t: (key: string) => string
): FieldDef {
  const isTextSubtype = ['number', 'currency', 'iban', 'email', 'url', 'regex'].includes(activeTool);
  const isButtonSubtype = activeTool === 'lockButton';
  const type = isTextSubtype ? 'text' : (isButtonSubtype ? 'button' : activeTool as any);
  const sizes = DEFAULT_SIZES[type] || { w: 144, h: 24 };
  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);

  const textSubType = isTextSubtype ? (activeTool as NonNullable<FieldDef['textSubType']>) : undefined;
  const prefix = activeTool.charAt(0).toUpperCase() + activeTool.slice(1);

  let counter = 1;
  let baseName = '';
  while (true) {
    baseName = `${prefix} -- ${counter}`;
    if (!fields.some((f) => f.name === baseName)) break;
    counter++;
  }

  return {
    id,
    pageIndex,
    type: type as FieldDef['type'],
    name: baseName,
    label: baseName,
    pdfX,
    pdfY: pdfY - sizes.h, // anchor top-left
    pdfWidth: sizes.w,
    pdfHeight: sizes.h,
    fontSize: 12,
    fontWeight: 'regular',
    textSubType,
    options: activeTool === 'dropdown' ? [] : undefined,
    checkedByDefault: activeTool === 'checkbox' ? false : undefined,
    groupName: activeTool === 'radio' ? 'group1' : undefined,
    radioValue: activeTool === 'radio' ? id.slice(0, 4) : undefined,
    ...(activeTool === 'barcode' ? { barcodeFormat: 'qrcode' } : {}),
    ...(activeTool === 'time' ? { timeFormat: '24h' } : {}),
    ...(activeTool === 'scaleRating' ? { scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Worst', scaleMaxLabel: 'Best' } : {}),
    ...(activeTool === 'inputTable' ? { tableRows: ['Row 1', 'Row 2'], tableCols: ['Col 1', 'Col 2'], tableInputType: 'textbox' } : {}),
    ...(activeTool === 'yesNo' ? { yesLabel: 'JA', noLabel: 'NEIN' } : {}),
    buttonAction: activeTool === 'lockButton' ? 'lock' : (type === 'button' ? 'submit' : undefined),
    tooltip: activeTool === 'lockButton' ? t('fields.lockButtonTooltip') : undefined,
  };
}
