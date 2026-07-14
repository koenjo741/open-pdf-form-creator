import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function ButtonFieldPanel({ field }: Props) {
  const updateField = useEditorStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
          Button-Aktion
        </label>
        <select
          value={field.buttonAction || 'submit'}
          onChange={(e) => updateField(field.id, { buttonAction: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 outline-none transition-colors"
        >
          <option value="submit">Sende-Button (Webhook/API)</option>
          <option value="lock">Formular Sperren (Lock)</option>
        </select>
      </div>

      {field.buttonAction !== 'lock' ? (
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
      ) : (
        <div className="p-3 mt-2 bg-amber-900/20 border border-amber-500/20 rounded-lg">
          <h4 className="text-[11px] font-semibold text-amber-400 mb-1">Sperren-Modus</h4>
          <p className="text-[10px] text-amber-300/80 leading-snug">
            Beim Klick auf diesen Button im PDF werden alle Felder dauerhaft auf "Nur-Lesen" (ReadOnly) gesetzt. 
            Dadurch können keine Änderungen mehr vorgenommen werden. Der Button selbst wird nach dem Klick ausgeblendet.
          </p>
        </div>
      )}

      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />
    </div>
  );
}
