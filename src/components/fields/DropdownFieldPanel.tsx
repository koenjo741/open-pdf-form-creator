import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { Plus, X, GripVertical, ChevronDown } from 'lucide-react';
import type { FieldDef } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';

const SALUTATION_PRESET = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const TITLE_PRESET = ['B.Sc.', 'M.Sc.', 'MBA', 'M.D.', 'Ph.D.', 'Prof.'];

interface Props { field: FieldDef; }

export function DropdownFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();
  const [newOption, setNewOption] = useState('');
  const [presetsOpen, setPresetsOpen] = useState(false);

  const options = field.options ?? [];

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    updateField(field.id, { options: [...options, trimmed] });
    setNewOption('');
  };

  const removeOption = (opt: string) => {
    updateField(field.id, { options: options.filter((o) => o !== opt) });
  };

  const applyPreset = (preset: string[]) => {
    updateField(field.id, { options: preset });
    setPresetsOpen(false);
  };

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />

      {/* Options */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-400">{t('sidebar.options')}</label>

          {/* Presets button */}
          <div className="relative">
            <button
              id={`dropdown-presets-btn-${field.id}`}
              onClick={() => setPresetsOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('sidebar.presets')} <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {presetsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl z-10 overflow-hidden"
                  onMouseLeave={() => setPresetsOpen(false)}
                >
                  <button
                    onClick={() => applyPreset(SALUTATION_PRESET)}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {t('sidebar.salutations')}
                  </button>
                  <button
                    onClick={() => applyPreset(TITLE_PRESET)}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {t('sidebar.titles')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Option list */}
        <div className="space-y-1 mb-2 max-h-44 overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {options.map((opt) => (
              <motion.div
                key={opt}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 group"
              >
                <GripVertical className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                <span className="flex-1 text-xs text-zinc-300 truncate">{opt}</span>
                <button
                  onClick={() => removeOption(opt)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                  aria-label={`Remove ${opt}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {options.length === 0 && (
            <p className="text-zinc-600 text-xs text-center py-3">No options yet</p>
          )}
        </div>

        {/* Add option input */}
        <div className="flex gap-1.5">
          <input
            id={`dropdown-add-option-${field.id}`}
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder={t('sidebar.addOption')}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
              text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          />
          <button
            onClick={addOption}
            className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 transition-colors"
            aria-label="Add option"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
