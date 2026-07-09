import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { Type, ChevronDown, CheckSquare, Circle, MousePointer, Calendar } from 'lucide-react';
import type { ToolMode } from '../../types';

const TOOLS: { mode: ToolMode; icon: React.ReactNode; labelKey: string }[] = [
  { mode: 'select',   icon: <MousePointer className="w-4 h-4" />, labelKey: 'tools.select' },
  { mode: 'text',     icon: <Type className="w-4 h-4" />,         labelKey: 'tools.text' },
  { mode: 'dropdown', icon: <ChevronDown className="w-4 h-4" />,  labelKey: 'tools.dropdown' },
  { mode: 'date',     icon: <Calendar className="w-4 h-4" />,     labelKey: 'tools.date' },
  { mode: 'checkbox', icon: <CheckSquare className="w-4 h-4" />,  labelKey: 'tools.checkbox' },
  { mode: 'radio',    icon: <Circle className="w-4 h-4" />,       labelKey: 'tools.radio' },
];

export function AddFieldToolbar() {
  const { t } = useTranslation();
  const { activeTool, setActiveTool } = useEditorStore();

  return (
    <div className="flex items-center gap-2 px-6 h-12 bg-[#020617]/90 backdrop-blur-md border-b border-zinc-800/60 overflow-x-auto">
      {TOOLS.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          id={`tool-${mode}-btn`}
          onClick={() => setActiveTool(mode)}
          className={`flex items-center justify-center gap-2 h-8 flex-1 min-w-[200px] max-w-[240px] whitespace-nowrap rounded-lg text-sm transition-colors ${
            activeTool === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 bg-[#1e293b] hover:bg-slate-700'
          }`}
        >
          {icon}
          <span className="hidden md:block leading-none pt-[2px]">{t(labelKey as Parameters<typeof t>[0])}</span>
        </button>
      ))}

      {/* Spacer & invisible placeholders to align perfectly with the header row above */}
      <div className="flex-1 min-w-0 px-2"></div>
      
      {/* Invisible equivalents of Undo/Redo/Lang buttons to match Header's exact flex layout */}
      <div className="p-2 w-8 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="p-2 w-8 opacity-0 pointer-events-none" aria-hidden="true" />
      <div className="px-2.5 py-2 w-12 opacity-0 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
