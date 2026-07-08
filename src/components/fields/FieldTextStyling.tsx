import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import type { FieldDef, FontWeight } from '../../types';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface Props { field: FieldDef; }

export function FieldTextStyling({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();

  return (
    <div className="space-y-4">
      {/* Font Size */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-zinc-400">{t('sidebar.fontSize')}</label>
          <span className="text-xs text-blue-400 font-mono">{field.fontSize ?? 12}pt</span>
        </div>
        <input
          id={`field-fontsize-${field.id}`}
          type="range"
          min={6}
          max={72}
          step={1}
          value={field.fontSize ?? 12}
          onChange={(e) => updateField(field.id, { fontSize: Number(e.target.value) })}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-zinc-600 text-xs mt-1">
          <span>6</span><span>72</span>
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sidebar.fontFamily')}</label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
          {(['proportional', 'monospace'] as const).map((f) => (
            <button
              key={f}
              id={`field-fontfamily-${f}-${field.id}`}
              onClick={() => updateField(field.id, { fontFamily: f })}
              className={`flex-1 py-2 text-sm transition-colors ${
                (field.fontFamily ?? 'proportional') === f
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t(`sidebar.${f}` as const)}
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sidebar.fontWeight')}</label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
          {(['regular', 'bold'] as FontWeight[]).map((w) => (
            <button
              key={w}
              id={`field-weight-${w}-${field.id}`}
              onClick={() => updateField(field.id, { fontWeight: w })}
              className={`flex-1 py-2 text-sm transition-colors ${
                (field.fontWeight ?? 'regular') === w
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t(`sidebar.${w}` as const)}
            </button>
          ))}
        </div>
      </div>

      {/* Text Align */}
      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1.5">{t('sidebar.textAlign')}</label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
          {(['left', 'center', 'right'] as const).map((align) => {
            let Icon = null;
            if (align === 'left') Icon = AlignLeft;
            else if (align === 'center') Icon = AlignCenter;
            else if (align === 'right') Icon = AlignRight;

            return (
              <button
                key={align}
                id={`field-align-${align}-${field.id}`}
                onClick={() => updateField(field.id, { textAlign: align })}
                title={t(`sidebar.${align}` as const)}
                className={`flex-1 flex justify-center items-center py-2 text-sm transition-colors ${
                  (field.textAlign ?? 'left') === align
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {Icon && <Icon className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
