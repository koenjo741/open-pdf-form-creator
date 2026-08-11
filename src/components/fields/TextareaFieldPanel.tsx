import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function TextareaFieldPanel({ field }: Props) {
  const updateField = useEditorStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
          Standardwert (Vorausgefüllt)
        </label>
        <textarea
          value={field.value || ''}
          onChange={(e) => updateField(field.id, { value: e.target.value })}
          placeholder="Optional"
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 outline-none transition-colors resize-y min-h-[60px]"
        />
        <div className="text-[10px] text-zinc-400 leading-tight mt-1">
          Zeilenumbruch: automatisch, <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-[9px]">Strg+Enter</kbd> oder <kbd className="px-1 py-0.5 bg-zinc-700 rounded text-[9px]">Alt+Enter</kbd>
        </div>
      </div>

      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />
    </div>
  );
}
