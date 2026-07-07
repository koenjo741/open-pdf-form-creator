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
    </>
  );
}
