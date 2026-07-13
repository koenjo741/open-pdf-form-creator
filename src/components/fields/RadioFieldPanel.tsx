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
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
          {t('sidebar.groupName')}
        </label>
        <input
          id={`field-groupname-${field.id}`}
          type="text"
          value={field.groupName ?? ''}
          onChange={(e) => updateField(field.id, { groupName: e.target.value })}
          placeholder={t('sidebar.groupNamePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-500 outline-none
            focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
        <p className="text-zinc-500 text-xs mt-1">
          Radio buttons with the same group name form one AcroForm radio group.
        </p>
      </div>

      {/* Export Value */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">
          {t('sidebar.radioValue')}
        </label>
        <input
          id={`field-radiovalue-${field.id}`}
          type="text"
          value={field.radioValue ?? ''}
          onChange={(e) => updateField(field.id, { radioValue: e.target.value })}
          placeholder={t('sidebar.radioValuePlaceholder')}
          className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
            text-sm text-zinc-100 placeholder:text-zinc-500 outline-none
            focus:ring-2 focus:ring-blue-500/50 transition-colors"
        />
      </div>

      {/* Default state */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              field.checkedByDefault
                ? 'bg-blue-600 border-blue-600'
                : 'bg-zinc-800 border-zinc-600 group-hover:border-blue-500'
            }`}
            onClick={() => {
              // If we check this radio by default, uncheck others in the same group
              if (!field.checkedByDefault) {
                const sameGroup = useEditorStore.getState().fields.filter(
                  f => f.type === 'radio' && (f.groupName ?? f.name) === (field.groupName ?? field.name) && f.id !== field.id
                );
                sameGroup.forEach(f => updateField(f.id, { checkedByDefault: false }));
              }
              updateField(field.id, { checkedByDefault: !field.checkedByDefault });
            }}
          >
            {field.checkedByDefault && (
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            )}
          </div>
          <span className="text-sm text-zinc-300">{t('sidebar.defaultChecked')}</span>
        </label>
      </div>
    </div>
  );
}
