import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface PromptModalProps {
  open: boolean;
  title: string;
  initialValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ open, title, initialValue = '', onConfirm, onCancel }: PromptModalProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
    }
  }, [open, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

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
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none will-change-transform"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-xl max-w-md w-full p-6 pointer-events-auto flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-white text-lg">{title}</h3>
              
              <input
                type="text"
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
              
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-zinc-300 hover:text-white hover:bg-zinc-800 text-sm font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  OK
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
