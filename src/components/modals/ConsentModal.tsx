import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Shield, Lock, Code2, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const CONSENT_KEY = 'openpdfform-consent-v1';

export function ConsentModal() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  const handleAgree = () => {
    localStorage.setItem(CONSENT_KEY, 'true');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="consent-title"
          >
            <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl max-w-md w-full p-8 overflow-hidden">
              {/* Decorative gradient orb */}
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-indigo-600/10 blur-3xl pointer-events-none" />

              {/* Icon */}
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/20 mb-6 mx-auto">
                <Shield className="w-7 h-7 text-blue-400" />
              </div>

              <h2
                id="consent-title"
                className="text-2xl font-semibold text-white text-center mb-3"
              >
                {t('consent.title')}
              </h2>
              <p className="text-zinc-400 text-sm text-center leading-relaxed mb-6">
                {t('consent.body')}
              </p>

              {/* Feature pills */}
              <div className="flex flex-col gap-2 mb-7">
                {[
                  { icon: <Lock className="w-4 h-4 text-emerald-400" />, text: '100% local processing — no uploads' },
                  { icon: <Shield className="w-4 h-4 text-blue-400" />, text: 'Zero analytics or telemetry' },
                  { icon: <Code2 className="w-4 h-4 text-violet-400" />, text: 'Open-source · MIT License' },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/40">
                    {icon}
                    <span className="text-zinc-300 text-sm">{text}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                id="consent-agree-btn"
                onClick={handleAgree}
                className="
                  w-full flex items-center justify-center gap-2 px-6 py-3.5
                  bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                  text-white font-medium rounded-xl
                  transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-900
                "
              >
                {t('consent.agree')}
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-zinc-600 text-xs text-center mt-4">
                {t('consent.subtext')}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
