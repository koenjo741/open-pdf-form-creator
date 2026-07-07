import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { Type, ChevronDown, CheckSquare, Circle, MousePointer } from 'lucide-react';
import type { ToolMode } from '../../types';

const TOOLS: { mode: ToolMode; icon: React.ReactNode; labelKey: string }[] = [
  { mode: 'select',   icon: <MousePointer className="w-4 h-4" />, labelKey: 'tools.select' },
  { mode: 'text',     icon: <Type className="w-4 h-4" />,         labelKey: 'tools.text' },
  { mode: 'dropdown', icon: <ChevronDown className="w-4 h-4" />,  labelKey: 'tools.dropdown' },
  { mode: 'checkbox', icon: <CheckSquare className="w-4 h-4" />,  labelKey: 'tools.checkbox' },
  { mode: 'radio',    icon: <Circle className="w-4 h-4" />,        labelKey: 'tools.radio' },
];

export function AddFieldToolbar() {
  const { t } = useTranslation();
  const { activeTool, setActiveTool } = useEditorStore();

  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
      <span className="text-xs text-zinc-600 font-medium mr-2 hidden sm:block">Tool:</span>
      {TOOLS.map(({ mode, icon, labelKey }) => (
        <button
          key={mode}
          id={`tool-${mode}-btn`}
          onClick={() => setActiveTool(mode)}
          title={t(labelKey as Parameters<typeof t>[0])}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            activeTool === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          {icon}
          <span className="hidden md:block">{t(labelKey as Parameters<typeof t>[0])}</span>
        </button>
      ))}
    </div>
  );
}
