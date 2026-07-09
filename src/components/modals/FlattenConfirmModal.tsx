import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface FlattenConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FlattenConfirmModal({ open, onConfirm, onCancel }: FlattenConfirmModalProps) {
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
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none will-change-transform"
          >
            <div
              className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl max-w-sm w-full p-6 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="font-semibold text-white">{t('export.confirmFlatten')}</h3>
              </div>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                {t('export.confirmFlattenMessage')}
              </p>
              <div className="flex gap-3">
                <button
                  id="flatten-cancel-btn"
                  onClick={onCancel}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors shadow-sm"
                >
                  {t('export.cancel')}
                </button>
                <button
                  id="flatten-confirm-btn"
                  onClick={onConfirm}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors shadow-sm"
                >
                  {t('export.confirm')}
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
