import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function RadioFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />

      {/* Group Name */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('sidebar.groupName')}
        </label>
        <input
          id={`field-groupname-${field.id}`}
          type="text"
          value={field.groupName ?? ''}
          onChange={(e) => updateField(field.id, { groupName: e.target.value })}
          placeholder={t('sidebar.groupNamePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-600 outline-none
            focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
        <p className="text-zinc-600 text-xs mt-1">
          Radio buttons with the same group name form one AcroForm radio group.
        </p>
      </div>

      {/* Export Value */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">
          {t('sidebar.radioValue')}
        </label>
        <input
          id={`field-radiovalue-${field.id}`}
          type="text"
          value={field.radioValue ?? ''}
          onChange={(e) => updateField(field.id, { radioValue: e.target.value })}
          placeholder={t('sidebar.radioValuePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-600 outline-none
            focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
      </div>
    </div>
  );
}
