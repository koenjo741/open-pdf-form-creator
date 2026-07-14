import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function ButtonFieldPanel({ field }: Props) {
  const updateField = useEditorStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 mb-2">
        <label className="block text-xs font-medium text-zinc-300">
          Ziel-URL (Webhook)
        </label>
        <input
          type="text"
          value={field.submitUrl || ''}
          onChange={(e) => updateField(field.id, { submitUrl: e.target.value })}
          placeholder="z.B. https://hooks.zapier.com/..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 outline-none transition-colors"
        />
        <div className="p-3 mt-2 bg-blue-900/20 border border-blue-500/20 rounded-lg">
          <h4 className="text-[11px] font-semibold text-blue-400 mb-1">Wie funktioniert das?</h4>
          <p className="text-[10px] text-blue-300/80 leading-snug space-y-1">
            Beim Klick im PDF werden alle Formulardaten (als HTML-Form-Daten) an diese URL geschickt. <br />
            <b>Variante A:</b> Sende die Daten direkt an eine eigene API, sofern diese Standard-Formulardaten ohne komplexe Header-Authentifizierung akzeptiert.<br />
            <b>Variante B:</b> Nutze Automatisierungsdienste wie <b>Zapier</b>, <b>Make.com</b> oder <b>n8n</b> als "Übersetzer", um die Daten in Google Sheets oder tausende andere Apps weiterzuleiten!
          </p>
        </div>
      </div>

      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />
    </div>
  );
}
