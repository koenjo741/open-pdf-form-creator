import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

export function TooltipLayer() {
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
    pos: 'top' | 'bottom';
  } | null>(null);

  useEffect(() => {
    let timeoutId: number;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (!target) {
        setTooltip(null);
        return;
      }
      const text = target.getAttribute('data-tooltip');
      if (!text) return;

      const rect = target.getBoundingClientRect();
      const posAttr = target.getAttribute('data-tooltip-pos') || 'top';
      const pos = posAttr as 'top' | 'bottom';

      // Clamp x to prevent tooltip from overflowing the window edges
      // Estimate width: ~6.5px per character for 11px font + 20px padding
      const estimatedWidth = text.length * 6.5 + 20; 
      const minLeft = estimatedWidth / 2 + 8;
      const maxLeft = window.innerWidth - (estimatedWidth / 2 + 8);
      
      let x = rect.left + rect.width / 2;
      x = Math.max(minLeft, Math.min(x, maxLeft));

      // Slight delay to avoid flicker and make it feel elegant
      timeoutId = window.setTimeout(() => {
        setTooltip({
          text,
          x,
          y: pos === 'top' ? rect.top - 6 : rect.bottom + 6,
          pos,
        });
      }, 150);
    };

    const handleMouseOut = (e: MouseEvent) => {
      clearTimeout(timeoutId);
      const target = (e.target as HTMLElement).closest('[data-tooltip]');
      if (!target) return;
      const related = e.relatedTarget as HTMLElement;
      // If we move inside the same element, don't clear
      if (related && target.contains(related)) return;
      setTooltip(null);
    };

    const handleClick = () => {
      clearTimeout(timeoutId);
      setTooltip(null);
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  return createPortal(
    <AnimatePresence>
      {tooltip && (
        <motion.div
          key="global-tooltip"
          initial={{ opacity: 0, y: tooltip.pos === 'top' ? 4 : -4, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: tooltip.pos === 'top' ? 4 : -4, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: `translate(-50%, ${tooltip.pos === 'top' ? '-100%' : '0'})`,
            pointerEvents: 'none',
            zIndex: 99999,
          }}
          className="px-2.5 py-1.5 bg-[#0f172a]/90 text-zinc-200 text-[11px] font-medium rounded-md whitespace-nowrap shadow-xl border border-zinc-700/50 backdrop-blur-md"
        >
          {tooltip.text}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
