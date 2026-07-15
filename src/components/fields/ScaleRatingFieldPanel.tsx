import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function ScaleRatingFieldPanel({ field }: Props) {
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      
      <div className="space-y-1.5">
        <label htmlFor={`scaleMax-${field.id}`} className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Skala (Höchster Wert)
        </label>
        <select
          id={`scaleMax-${field.id}`}
          value={field.scaleMax || 5}
          onChange={(e) => updateField(field.id, { scaleMax: parseInt(e.target.value, 10), scaleMin: 1 })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 
            transition-all"
        >
          {[3, 4, 5, 6, 7, 8, 9, 10].map(val => (
            <option key={val} value={val}>1 bis {val}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`scaleMinLabel-${field.id}`} className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Beschriftung niedrigster Wert
        </label>
        <input
          id={`scaleMinLabel-${field.id}`}
          type="text"
          placeholder="z.B. Schlecht"
          value={field.scaleMinLabel || ''}
          onChange={(e) => updateField(field.id, { scaleMinLabel: e.target.value })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 
            transition-all"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`scaleMaxLabel-${field.id}`} className="block text-xs font-medium text-slate-700 dark:text-zinc-300">
          Beschriftung höchster Wert
        </label>
        <input
          id={`scaleMaxLabel-${field.id}`}
          type="text"
          placeholder="z.B. Sehr gut"
          value={field.scaleMaxLabel || ''}
          onChange={(e) => updateField(field.id, { scaleMaxLabel: e.target.value })}
          className="w-full h-8 px-2.5 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-md 
            text-sm text-slate-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 
            transition-all"
        />
      </div>

      <FieldTextStyling field={field} />
    </div>
  );
}
