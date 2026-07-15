import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { Plus, X } from 'lucide-react';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function InputTableFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();

  const rows = field.tableRows || ['Row 1', 'Row 2'];
  const cols = field.tableCols || ['Col 1', 'Col 2'];

  const addRow = () => updateField(field.id, { tableRows: [...rows, `Row ${rows.length + 1}`] });
  const addCol = () => updateField(field.id, { tableCols: [...cols, `Col ${cols.length + 1}`] });

  const updateRow = (index: number, val: string) => {
    const newRows = [...rows];
    newRows[index] = val;
    updateField(field.id, { tableRows: newRows });
  };
  const updateCol = (index: number, val: string) => {
    const newCols = [...cols];
    newCols[index] = val;
    updateField(field.id, { tableCols: newCols });
  };

  const removeRow = (index: number) => updateField(field.id, { tableRows: rows.filter((_, i) => i !== index) });
  const removeCol = (index: number) => updateField(field.id, { tableCols: cols.filter((_, i) => i !== index) });

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      
      <div className="space-y-1.5">
        <label htmlFor={`tableInputType-${field.id}`} className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Eingabetyp
        </label>
        <select
          id={`tableInputType-${field.id}`}
          value={field.tableInputType || 'radio'}
          onChange={(e) => updateField(field.id, { tableInputType: e.target.value as any })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 
            transition-all"
        >
          <option value="radio">Radio Buttons (Eine Auswahl pro Zeile)</option>
          <option value="checkbox">Kontrollkästchen (Mehrfachauswahl)</option>
          <option value="textbox">Textfelder</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Spalten
        </label>
        <div className="space-y-1">
          {cols.map((col, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={col}
                onChange={(e) => updateCol(i, e.target.value)}
                className="flex-1 h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
                  text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <button onClick={() => removeCol(i)} className="p-1 text-slate-400 hover:text-red-400" disabled={cols.length <= 1}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addCol} className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
          <Plus className="w-3 h-3" /> Spalte hinzufügen
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Zeilen
        </label>
        <div className="space-y-1">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={row}
                onChange={(e) => updateRow(i, e.target.value)}
                className="flex-1 h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
                  text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
              />
              <button onClick={() => removeRow(i)} className="p-1 text-slate-400 hover:text-red-400" disabled={rows.length <= 1}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addRow} className="flex items-center gap-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline">
          <Plus className="w-3 h-3" /> Zeile hinzufügen
        </button>
      </div>

      <FieldTextStyling field={field} />
    </div>
  );
}
