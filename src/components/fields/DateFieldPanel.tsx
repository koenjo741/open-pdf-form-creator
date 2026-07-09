import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import type { FieldDef } from '../../types';

interface Props { field: FieldDef; }

export function DateFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      
      <div className="space-y-1.5">
        <label htmlFor={`dateFormat-${field.id}`} className="block text-xs font-medium text-zinc-400">
          {t('fields.dateFormat')}
        </label>
        <select
          id={`dateFormat-${field.id}`}
          value={field.dateFormat || 'auto'}
          onChange={(e) => updateField(field.id, { dateFormat: e.target.value })}
          className="w-full h-8 px-2.5 bg-zinc-900 border border-zinc-700/60 rounded-md 
            text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 
            transition-all"
        >
          <option value="auto">{t('fields.dateFormatAuto')}</option>
          <option value="DD.MM.YYYY">DD.MM.YYYY</option>
          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
        </select>
      </div>

      <FieldTextStyling field={field} />
    </div>
  );
}
