import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { AlertCircle } from 'lucide-react';

interface AlertModalProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function AlertModal({ open, title, message, onClose }: AlertModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm will-change-opacity"
            onClick={onClose}
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
              <div className="flex gap-3 justify-end">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold transition-colors shadow-sm border border-zinc-700"
                >
                  OK
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
