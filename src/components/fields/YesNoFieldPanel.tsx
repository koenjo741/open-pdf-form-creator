import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function YesNoFieldPanel({ field }: Props) {
  const { updateField } = useEditorStore();

  const yesLabel = field.yesLabel || 'JA';
  const noLabel = field.noLabel || 'NEIN';

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Beschriftung für "JA"
        </label>
        <input
          type="text"
          value={yesLabel}
          onChange={(e) => updateField(field.id, { yesLabel: e.target.value })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Beschriftung für "NEIN"
        </label>
        <input
          type="text"
          value={noLabel}
          onChange={(e) => updateField(field.id, { noLabel: e.target.value })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
        />
      </div>

      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-zinc-800">
        <label className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Vorausgewählt
        </label>
        <select
          value={field.value || ''}
          onChange={(e) => updateField(field.id, { value: e.target.value })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
        >
          <option value="">Keine Auswahl</option>
          <option value="Yes">JA</option>
          <option value="No">NEIN</option>
        </select>
      </div>

      <FieldTextStyling field={field} />
    </div>
  );
}
