import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function TextFieldPanel({ field }: Props) {
  const updateField = useEditorStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          Feld-Typ (Textfeld)
        </label>
        <select
          value={field.textSubType || 'text'}
          onChange={(e) => updateField(field.id, { textSubType: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 outline-none transition-colors"
        >
          <option value="text">Normaler Text</option>
          <option value="number">Zahlen</option>
          <option value="currency">Währung</option>
          <option value="email">E-Mail</option>
        </select>
      </div>

      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />

      <div className="pt-4 border-t border-zinc-700/50">
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 flex justify-between items-center">
          <span>Berechnetes Feld (Formel)</span>
        </label>
        <div className="space-y-2">
          <textarea
            value={field.calculation || ''}
            onChange={(e) => updateField(field.id, { calculation: e.target.value })}
            placeholder="z.B. [Feld1] + [Feld2] * 2"
            className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
              text-sm text-zinc-100 outline-none transition-colors font-mono resize-y min-h-[60px]"
          />
          <div className="text-[10px] text-zinc-500 leading-tight">
            <b>Syntax:</b> Andere Felder in eckige Klammern setzen <code>[Name]</code>.<br />
            <b>Operatoren:</b> <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>Math.sqrt(x)</code>, <code>Math.pow(x, y)</code>
          </div>
        </div>
      </div>
    </div>
  );
}
