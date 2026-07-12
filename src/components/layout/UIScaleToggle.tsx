import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { ZoomIn, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SCALES = [
  { value: 0.75, label: '75%' },
  { value: 0.85, label: '85%' },
  { value: 1, label: '100%' },
  { value: 1.25, label: '125%' },
  { value: 1.5, label: '150%' }
];

export function UIScaleToggle() {
  const { uiScale, setUiScale } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const getLabel = () => {
    const scale = SCALES.find(s => s.value === uiScale);
    return scale ? scale.label : `${Math.round(uiScale * 100)}%`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center h-8 px-2 gap-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
        aria-label={`UI Scale: ${getLabel()}`}
        title={`UI Scale: ${getLabel()}`}
      >
        <ZoomIn className="w-4 h-4" />
        <span className="text-[10px] font-bold tracking-tight">{getLabel()}</span>
        <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 bottom-full mb-2 w-24 bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-20"
            onMouseLeave={() => setIsOpen(false)}
          >
            {SCALES.map((scale) => (
              <button
                key={scale.value}
                onClick={() => {
                  setUiScale(scale.value);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                  uiScale === scale.value
                    ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-600/10 font-medium'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                {scale.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
