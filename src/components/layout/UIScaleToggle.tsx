import { useEditorStore } from '../../store/useEditorStore';
import { ZoomIn } from 'lucide-react';

export function UIScaleToggle() {
  const { uiScale, setUiScale } = useEditorStore();

  // Cycle: 1 -> 1.25 -> 1.5 -> 1
  const toggleScale = () => {
    if (uiScale === 1) setUiScale(1.25);
    else if (uiScale === 1.25) setUiScale(1.5);
    else setUiScale(1);
  };

  const getLabel = () => {
    if (uiScale === 1) return '100%';
    if (uiScale === 1.25) return '125%';
    return '150%';
  };

  return (
    <button
      onClick={toggleScale}
      className="flex items-center justify-center h-8 px-2 gap-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
      aria-label={`UI Scale: ${getLabel()}`}
      title={`UI Scale: ${getLabel()}`}
    >
      <ZoomIn className="w-4 h-4" />
      <span className="text-[10px] font-bold tracking-tight">{getLabel()}</span>
    </button>
  );
}
