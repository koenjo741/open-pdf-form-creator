import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { HelpCircle, Check } from 'lucide-react';

interface DecimalSeparatorChoiceModalProps {
  open: boolean;
  onSelect: (separator: 'comma' | 'dot') => void;
}

export function DecimalSeparatorChoiceModal({ open, onSelect }: DecimalSeparatorChoiceModalProps) {
  const { t } = useTranslation();

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm will-change-opacity"
            onClick={() => onSelect('comma')}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none will-change-transform"
          >
            <div
              className="bg-zinc-900/95 border border-zinc-700/70 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with icon */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <HelpCircle className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">
                    {t('decimalChoice.title', 'Dezimaltrennzeichen auswählen')}
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {t('decimalChoice.subtitle', 'Punkt oder Komma zentrieren?')}
                  </p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-300 leading-relaxed mb-6">
                {t(
                  'decimalChoice.message',
                  'In Ihrer Zahl kommen sowohl Punkt (.) als auch Komma (,) vor (z. B. 11.000,58). Soll der Punkt oder das Komma am Tabulator zentriert/ausgerichtet werden?'
                )}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  id="decimal-choice-dot-btn"
                  onClick={() => onSelect('dot')}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-600/70 text-white text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 hover:border-zinc-500"
                >
                  <span className="font-mono text-base font-bold text-cyan-400">.</span>
                  {t('decimalChoice.dot', 'Punkt (.)')}
                </button>
                <button
                  id="decimal-choice-comma-btn"
                  onClick={() => onSelect('comma')}
                  className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-all shadow-md shadow-emerald-900/30 hover:shadow-emerald-800/50 flex items-center justify-center gap-2"
                >
                  <span className="font-mono text-base font-bold text-white">,</span>
                  {t('decimalChoice.comma', 'Komma (,)')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
