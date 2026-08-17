import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Keyboard, AlignLeft, AlignRight, Check } from 'lucide-react';

interface TabHintModalProps {
  open: boolean;
  onClose: () => void;
}

export function TabHintModal({ open, onClose }: TabHintModalProps) {
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
              className="bg-zinc-900/95 border border-zinc-700/70 rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto backdrop-blur-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with icon */}
              <div className="flex items-center gap-3.5 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-inner">
                  <Keyboard className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">{t('tabHint.title')}</h3>
                  <p className="text-xs text-zinc-400">{t('tabHint.subtitle')}</p>
                </div>
              </div>

              {/* Information Cards */}
              <div className="space-y-2.5 my-5">
                {/* 1. Left Tab Card */}
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                    <AlignLeft className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <kbd className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-[11px] font-mono font-semibold text-blue-400 shadow-sm">
                        TAB
                      </kbd>
                      <span className="text-xs font-medium text-zinc-200">{t('tabHint.leftTab')}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {t('tabHint.leftTabDesc')}
                    </p>
                  </div>
                </div>

                {/* 2. Right Tab Card */}
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0">
                    <AlignRight className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-[11px] font-mono font-semibold text-cyan-400 shadow-sm">
                          SHIFT
                        </kbd>
                        <span className="text-xs text-zinc-500">+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-[11px] font-mono font-semibold text-cyan-400 shadow-sm">
                          TAB
                        </kbd>
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{t('tabHint.rightTab')}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {t('tabHint.rightTabDesc')}
                    </p>
                  </div>
                </div>

                {/* 3. Decimal / Comma Tab Card */}
                <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-start gap-3">
                  <div className="mt-0.5 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0 flex items-center justify-center w-7 h-7">
                    <span className="font-mono font-extrabold text-sm leading-none">,</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-[11px] font-mono font-semibold text-emerald-400 shadow-sm">
                          ALT
                        </kbd>
                        <span className="text-xs text-zinc-500">+</span>
                        <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 text-[11px] font-mono font-semibold text-emerald-400 shadow-sm">
                          T
                        </kbd>
                      </div>
                      <span className="text-xs font-medium text-zinc-200">{t('tabHint.commaTab')}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {t('tabHint.commaTabDesc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-1">
                <button
                  id="tab-hint-confirm-btn"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-blue-900/30 hover:shadow-blue-800/50 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {t('tabHint.confirm')}
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
