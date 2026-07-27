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
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">{t('sidebar.fontSize')}</label>
        <div className="flex items-center gap-2">
          <div className="flex items-center flex-1 min-w-0 rounded bg-zinc-800 border border-zinc-700/60 focus-within:border-blue-500/50">
            <input
              id={`field-fontsize-${field.id}`}
              type="number"
              min={6}
              max={72}
              step={1}
              value={field.fontSize ?? 12}
              onChange={(e) => updateField(field.id, { fontSize: Math.min(72, Math.max(6, Number(e.target.value) || 6)) })}
              className="flex-1 min-w-0 px-2 py-1 bg-transparent text-xs text-zinc-100 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-zinc-500 pr-1">pt</span>
            <div className="flex flex-col border-l border-zinc-700/60">
              <button
                type="button"
                onClick={() => updateField(field.id, { fontSize: Math.min(72, (field.fontSize ?? 12) + 1) })}
                className="px-1.5 py-0 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors leading-tight"
                aria-label="Increase font size"
              >+</button>
              <button
                type="button"
                onClick={() => updateField(field.id, { fontSize: Math.max(6, (field.fontSize ?? 12) - 1) })}
                className="px-1.5 py-0 text-[10px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors leading-tight border-t border-zinc-700/60"
                aria-label="Decrease font size"
              >−</button>
            </div>
          </div>
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">{t('sidebar.fontFamily')}</label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
          {(['proportional', 'monospace'] as const).map((f) => (
            <button
              key={f}
              id={`field-fontfamily-${f}-${field.id}`}
              onClick={() => updateField(field.id, { fontFamily: f })}
              className={`flex-1 py-2 text-sm transition-colors ${
                (field.fontFamily ?? 'proportional') === f
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-zinc-800 text-zinc-300 hover:text-zinc-100'
              }`}
            >
              {t(`sidebar.${f}` as const)}
            </button>
          ))}
        </div>
      </div>

      {/* Font Weight */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">{t('sidebar.fontWeight')}</label>
        <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
          {(['regular', 'bold'] as FontWeight[]).map((w) => (
            <button
              key={w}
              id={`field-weight-${w}-${field.id}`}
              onClick={() => updateField(field.id, { fontWeight: w })}
              data-tooltip={t(`sidebar.${w}` as const)}
              className={`flex-1 py-2 text-sm transition-colors ${
                (field.fontWeight ?? 'regular') === w
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-zinc-800 text-zinc-300 hover:text-zinc-100'
              }`}
            >
              {t(`sidebar.${w}` as const)}
            </button>
          ))}
        </div>
      </div>

      {/* Text Align */}
      <div>
        <label className="block text-xs font-medium text-zinc-300 mb-1.5">{t('sidebar.textAlign')}</label>
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
                    : 'bg-zinc-800 text-zinc-300 hover:text-zinc-100'
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
