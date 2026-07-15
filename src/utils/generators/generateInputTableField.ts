import { rgb } from 'pdf-lib';
import type { FieldDef } from '../../types';
import type { FieldGeneratorContext } from './types';
import { tryGetRadioGroup } from './utils';

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
  const lineColor = rgb(0.5, 0.5, 0.5);
  const textColor = rgb(0, 0, 0);
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
