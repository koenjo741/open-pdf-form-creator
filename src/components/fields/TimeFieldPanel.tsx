import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function TimeFieldPanel({ field }: Props) {
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      
      <div className="space-y-1.5">
        <label htmlFor={`timeFormat-${field.id}`} className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Uhrzeit Format
        </label>
        <select
          id={`timeFormat-${field.id}`}
          value={field.timeFormat || '24h'}
          onChange={(e) => updateField(field.id, { timeFormat: e.target.value as '24h' | '12h' })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 
            transition-all"
        >
          <option value="24h">24 Stunden (HH:MM)</option>
          <option value="12h">12 Stunden (HH:MM AM/PM)</option>
        </select>
      </div>

      <FieldTextStyling field={field} />
    </div>
  );
}
