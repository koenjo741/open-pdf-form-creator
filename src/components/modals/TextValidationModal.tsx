import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

interface TextValidationModalProps {
  open: boolean;
  title: string;
  message: string;
  onCorrect: () => void;
}

export function TextValidationModal({ open, title, message, onCorrect }: TextValidationModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
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
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-red-500/15">
                  <AlertCircle className="w-6 h-6 text-red-400" />
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
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
