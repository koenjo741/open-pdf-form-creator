import { FieldDef } from '../types';

export function formatTableValues(field: FieldDef, fallbackTableValues?: any): any {
  if (field.type !== 'inputTable') return {};
  
  const values = fallbackTableValues || field.tableValues || {};
  const rows = field.tableRows || [];
  const cols = field.tableCols || [];
  const inputType = field.tableInputType || 'radio';
  
  const formatted: Record<string, any> = {};

  if (inputType === 'radio') {
    for (let r = 0; r < rows.length; r++) {
      const rowName = rows[r] || `Row ${r + 1}`;
      const selectedColIndex = values[`r${r}`];
      if (selectedColIndex !== undefined && selectedColIndex !== null) {
        formatted[rowName] = cols[selectedColIndex] || `Col ${selectedColIndex + 1}`;
      } else {
        formatted[rowName] = null;
      }
    }
  } else {
    for (let r = 0; r < rows.length; r++) {
      const rowName = rows[r] || `Row ${r + 1}`;
      formatted[rowName] = {};
      for (let c = 0; c < cols.length; c++) {
        const colName = cols[c] || `Col ${c + 1}`;
        formatted[rowName][colName] = values[`r${r}_c${c}`] ?? (inputType === 'checkbox' ? false : '');
      }
    }
  }

  return formatted;
}
