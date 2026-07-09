import { useState } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export function FieldDirectionalPad() {
  const { fields, selectedFieldIds, updateField } = useEditorStore();
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);

  const handleMouseEnterPad = () => {
    if (!sessionStorage.getItem('dpad_tooltip_shown')) {
      setShowTooltip(true);
      sessionStorage.setItem('dpad_tooltip_shown', 'true');
      setTimeout(() => setShowTooltip(false), 4000);
    }
  };

  const handleMove = (dx: number, dy: number, e: React.MouseEvent) => {
    // If ctrl/meta is held, move by 10 instead of 1
    const step = (e.ctrlKey || e.metaKey) ? 10 : 1;
    
    selectedFieldIds.forEach((id) => {
      const field = fields.find((f) => f.id === id);
      if (field) {
        updateField(id, {
          pdfX: field.pdfX + dx * step,
          pdfY: field.pdfY + dy * step,
        });
      }
    });
  };

  return (
    <div 
      className="flex flex-col items-center justify-center py-2 relative"
      onMouseEnter={handleMouseEnterPad}
    >
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute bottom-[calc(100%-8px)] mb-2 w-max max-w-[140px] bg-blue-600 text-white text-[10px] p-2 rounded shadow-lg text-center z-50 pointer-events-none"
          >
            {t('editor.dpadTip')}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-blue-600" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-3 gap-1">
        <div />
        <button
          onClick={(e) => handleMove(0, 1, e)}
          className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div />
        
        <button
          onClick={(e) => handleMove(-1, 0, e)}
          className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center justify-center relative">
          <div className="w-1.5 h-1.5 rounded-full bg-zinc-700" />
        </div>
        <button
          onClick={(e) => handleMove(1, 0, e)}
          className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        
        <div />
        <button
          onClick={(e) => handleMove(0, -1, e)}
          className="p-2 bg-zinc-800/80 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
        <div />
      </div>
    </div>
  );
}
