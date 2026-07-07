import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function CheckboxFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />

      {/* Default state */}
      <div>
        <label className="flex items-center gap-3 cursor-pointer group">
          <div
            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
              field.checkedByDefault
                ? 'bg-blue-600 border-blue-600'
                : 'bg-zinc-800 border-zinc-600 group-hover:border-blue-500'
            }`}
            onClick={() => updateField(field.id, { checkedByDefault: !field.checkedByDefault })}
          >
            {field.checkedByDefault && (
              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className="text-sm text-zinc-300">{t('sidebar.defaultChecked')}</span>
        </label>
      </div>
    </div>
  );
}
