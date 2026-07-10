import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

/** Shared name + label inputs used by all field panels */
export function FieldCommonInputs({ field }: Props) {
  const { t } = useTranslation();
  const { updateField, isNameTaken } = useEditorStore();
  const nameTaken = isNameTaken(field.name, field.id);

  return (
    <>
      {/* Field Name */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('sidebar.name')}
        </label>
        <input
          id={`field-name-${field.id}`}
          type="text"
          value={field.name}
          onChange={(e) => updateField(field.id, { name: e.target.value })}
          placeholder={t('sidebar.namePlaceholder')}
          className={`w-full px-3 py-2 rounded-lg bg-zinc-800 border text-sm text-zinc-100
            placeholder:text-zinc-600 outline-none transition-colors
            focus:ring-2 focus:ring-blue-500/50
            ${nameTaken ? 'border-red-500/60' : 'border-zinc-700/60 focus:border-blue-500/50'}`}
        />
        {nameTaken && (
          <p className="text-red-400 text-xs mt-1">{t('sidebar.nameError')}</p>
        )}
        <p className="text-zinc-500 text-[10px] mt-1.5 leading-tight">
          <b>Tipp:</b> Wenn du zwei Feldern exakt denselben Namen gibst, werden ihre Werte im fertigen PDF automatisch in Echtzeit gespiegelt.
        </p>
      </div>

      {/* Label */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('sidebar.label')}
        </label>
        <input
          id={`field-label-${field.id}`}
          type="text"
          value={field.label}
          onChange={(e) => updateField(field.id, { label: e.target.value })}
          placeholder={t('sidebar.labelPlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-600 outline-none
            focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
      </div>

      {/* Tab Order */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          Tab-Reihenfolge
        </label>
        <input
          id={`field-tabindex-${field.id}`}
          type="number"
          min="1"
          step="1"
          value={field.tabIndex ?? ''}
          onChange={(e) => {
            const val = e.target.value;
            const num = val ? parseInt(val, 10) : undefined;
            useEditorStore.getState().setTabIndex(field.id, num);
          }}
          placeholder="Automatisch"
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
      </div>

      {/* Geometry Settings */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5 mt-2">
          Position & Größe (pt)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-3">X:</span>
            <input
              type="number"
              value={Math.round(field.pdfX)}
              onChange={(e) => updateField(field.id, { pdfX: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-100 outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-3">Y:</span>
            <input
              type="number"
              value={Math.round(field.pdfY)}
              onChange={(e) => updateField(field.id, { pdfY: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-100 outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-3">B:</span>
            <input
              type="number"
              value={Math.round(field.pdfWidth)}
              onChange={(e) => updateField(field.id, { pdfWidth: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-100 outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 w-3">H:</span>
            <input
              type="number"
              value={Math.round(field.pdfHeight)}
              onChange={(e) => updateField(field.id, { pdfHeight: parseInt(e.target.value) || 0 })}
              className="flex-1 px-2 py-1 rounded bg-zinc-800 border border-zinc-700/60 text-xs text-zinc-100 outline-none focus:border-blue-500/50"
            />
          </div>
        </div>
      </div>
    </>
  );
}
