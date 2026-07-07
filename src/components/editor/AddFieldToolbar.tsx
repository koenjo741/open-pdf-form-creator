import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { Type, ChevronDown, CheckSquare, Circle, MousePointer } from 'lucide-react';
import type { ToolMode } from '../../types';

const TOOLS: { mode: ToolMode; icon: React.ReactNode; labelKey: string; widthClass: string }[] = [
  { mode: 'select',   icon: <MousePointer className="w-4 h-4" />, labelKey: 'tools.select',   widthClass: 'w-24' },
  { mode: 'text',     icon: <Type className="w-4 h-4" />,         labelKey: 'tools.text',     widthClass: 'w-28' },
  { mode: 'dropdown', icon: <ChevronDown className="w-4 h-4" />,  labelKey: 'tools.dropdown', widthClass: 'w-32' },
  { mode: 'checkbox', icon: <CheckSquare className="w-4 h-4" />,  labelKey: 'tools.checkbox', widthClass: 'w-32' },
  { mode: 'radio',    icon: <Circle className="w-4 h-4" />,       labelKey: 'tools.radio',    widthClass: 'w-28' },
];

export function AddFieldToolbar() {
  const { t } = useTranslation();
  const { activeTool, setActiveTool } = useEditorStore();

  return (
    <div className="flex items-center gap-2 px-6 h-12 bg-[#020617]/90 backdrop-blur-md border-b border-zinc-800/60">
      {TOOLS.map(({ mode, icon, labelKey, widthClass }) => (
        <button
          key={mode}
          id={`tool-${mode}-btn`}
          onClick={() => setActiveTool(mode)}
          title={t(labelKey as Parameters<typeof t>[0])}
          className={`flex items-center justify-center gap-2 h-8 ${widthClass} rounded-lg text-sm transition-colors ${
            activeTool === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 bg-[#1e293b] hover:bg-slate-700'
          }`}
        >
          {icon}
          <span className="hidden md:block leading-none pt-[2px]">{t(labelKey as Parameters<typeof t>[0])}</span>
        </button>
      ))}
    </div>
  );
}
