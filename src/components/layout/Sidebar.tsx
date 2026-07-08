import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { TextFieldPanel } from '../fields/TextFieldPanel';
import { DropdownFieldPanel } from '../fields/DropdownFieldPanel';
import { CheckboxFieldPanel } from '../fields/CheckboxFieldPanel';
import { RadioFieldPanel } from '../fields/RadioFieldPanel';
import { Trash2, MousePointerClick } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FieldDef } from '../../types';

import { MultiSelectPanel } from '../fields/MultiSelectPanel';

export function Sidebar() {
  const { t } = useTranslation();
  const { fields, selectedFieldIds, deleteField } = useEditorStore();
  
  const selected: FieldDef | undefined = selectedFieldIds.length === 1 
    ? fields.find((f) => f.id === selectedFieldIds[0]) 
    : undefined;
  
  const isMultiSelect = selectedFieldIds.length > 1;

  const handleDelete = () => {
    if (selectedFieldIds.length === 0) return;
    deleteField(); // Deletes all selected when called with no ID
  };

  return (
    <aside className="w-72 shrink-0 flex flex-col bg-[#0f172a] border-l border-zinc-800/60 overflow-y-auto">
      <div className="px-4 h-12 flex items-center border-b border-zinc-800/60">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
          INFO
        </h2>
      </div>

      <AnimatePresence mode="wait">
        {selectedFieldIds.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 px-4 py-6 overflow-y-auto"
          >
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center gap-3 text-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
                  <MousePointerClick className="w-6 h-6 text-zinc-600" />
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">{t('sidebar.noSelectionHint')}</p>
              </div>

              <div className="pt-4 border-t border-zinc-800/60">
                <h3 className="text-xs font-semibold text-zinc-300 mb-4">{t('sidebar.infoTitle')}</h3>
                <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                  <div>
                    <strong className="text-zinc-300 block mb-1">{t('sidebar.infoFunctionTitle')}:</strong>
                    {t('sidebar.infoFunctionText')}
                    <ul className="list-disc pl-4 mt-2 space-y-1.5">
                      <li>{t('sidebar.infoFunctionPoint1')}</li>
                      <li>{t('sidebar.infoFunctionPoint2')}</li>
                    </ul>
                  </div>
                  <div>
                    <strong className="text-zinc-300 block mb-1">{t('sidebar.infoPrivacyTitle')}:</strong>
                    {t('sidebar.infoPrivacyText')}
                  </div>
                  <div>
                    <strong className="text-zinc-300 block mb-1">{t('sidebar.infoLicenseTitle')}:</strong>
                    {t('sidebar.infoLicenseText')}
                  </div>
                  <div>
                    <strong className="text-zinc-300 block mb-1">{t('sidebar.infoDisclaimerTitle')}:</strong>
                    {t('sidebar.infoDisclaimerText')}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={isMultiSelect ? 'multi' : selected!.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.18 }}
            className="flex-1 flex flex-col"
          >
            {/* Field-type specific panel or MultiSelect Panel */}
            <div className="flex-1 px-4 py-4 space-y-4">
              {isMultiSelect ? (
                <MultiSelectPanel />
              ) : selected ? (
                <>
                  {selected.type === 'text' && <TextFieldPanel field={selected} />}
                  {selected.type === 'dropdown' && <DropdownFieldPanel field={selected} />}
                  {selected.type === 'checkbox' && <CheckboxFieldPanel field={selected} />}
                  {selected.type === 'radio' && <RadioFieldPanel field={selected} />}
                </>
              ) : null}
            </div>

            {/* Delete button */}
            <div className="px-4 pb-4 pt-2 border-t border-zinc-800/60">
              <button
                id="sidebar-delete-btn"
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                  bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/40
                  text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {isMultiSelect ? `Delete ${selectedFieldIds.length} Fields` : t('sidebar.deleteField')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}
