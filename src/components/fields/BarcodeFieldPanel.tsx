import { FieldCommonInputs } from './FieldCommonInputs';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function BarcodeFieldPanel({ field }: Props) {
  const updateField = useEditorStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-zinc-300 mb-1.5">
          Barcode Format
        </label>
        <select
          value={field.barcodeFormat || 'qrcode'}
          onChange={(e) => updateField(field.id, { barcodeFormat: e.target.value as any })}
          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700/60 focus:border-cyan-500/50
            text-sm text-slate-700 dark:text-zinc-100 outline-none transition-colors"
        >
          <option value="qrcode">QR Code</option>
          <option value="pdf417">PDF417 (Behörden-Standard)</option>
        </select>
        <p className="mt-2 text-xs text-slate-500 dark:text-zinc-300">
          Der Barcode encodiert automatisch alle Formulardaten. Er wird erst beim finalen (Flattened) PDF-Export generiert.
        </p>
      </div>

      <FieldCommonInputs field={field} />
    </div>
  );
}
