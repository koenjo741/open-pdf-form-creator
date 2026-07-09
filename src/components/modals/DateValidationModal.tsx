import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AlertCircle, CalendarClock, CalendarX2 } from 'lucide-react';

interface DateValidationModalProps {
  open: boolean;
  type: 'invalid' | 'history' | 'future' | null;
  onConfirm: () => void;
  onCorrect: () => void;
}

export function DateValidationModal({ open, type, onConfirm, onCorrect }: DateValidationModalProps) {
  const { t } = useTranslation();

  // Remove early return to allow AnimatePresence to work properly
  let title = '';
  let message = '';
  let icon = <AlertCircle className="w-6 h-6 text-red-400" />;
  let showConfirm = true;

  if (type === 'invalid') {
    title = t('validation.invalidTitle', 'Falsches Datum');
    message = t('validation.dateInvalid');
    icon = <CalendarX2 className="w-6 h-6 text-red-400" />;
    showConfirm = false; // For completely invalid dates, they must correct it
  } else if (type === 'history') {
    title = t('validation.historyTitle', 'Historisches Datum');
    message = t('validation.dateHistory');
    icon = <CalendarClock className="w-6 h-6 text-amber-400" />;
  } else if (type === 'future') {
    title = t('validation.futureTitle', 'Datum in der Zukunft');
    message = t('validation.dateFuture');
    icon = <CalendarClock className="w-6 h-6 text-amber-400" />;
  }

  return createPortal(
    <AnimatePresence>
      {open && type && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 will-change-opacity"
            onClick={onCorrect}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none will-change-transform"
          >
            <div
              className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-xl max-w-sm w-full p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${type === 'invalid' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                  {icon}
                </div>
                <h3 className="font-semibold text-white text-lg">{title}</h3>
              </div>
              <p className="text-zinc-300 text-sm leading-relaxed mb-8">
                {message}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCorrect}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors shadow-sm"
                >
                  Korrigieren
                </button>
                {showConfirm && (
                  <button
                    onClick={onConfirm}
                    className="flex-1 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors shadow-sm"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
