import { useEditorStore } from '../../store/useEditorStore';
import { AlignLeft, AlignCenter, AlignRight, ArrowLeftRight, ArrowUpDown, Maximize2 } from 'lucide-react';
import type { FieldDef } from '../../types';
import { useTranslation } from 'react-i18next';

export function MultiSelectPanel() {
  const { t } = useTranslation();
  const { fields, selectedFieldIds, updateField } = useEditorStore();

  const selectedFields = selectedFieldIds
    .map(id => fields.find(f => f.id === id))
    .filter((f): f is FieldDef => f !== undefined);

  if (selectedFields.length < 2) return null;

  const handleMatchWidth = () => {
    // Match width to the first selected field
    const targetWidth = selectedFields[0].pdfWidth;
    selectedFields.forEach(f => updateField(f.id, { pdfWidth: targetWidth }));
  };

  const handleMatchHeight = () => {
    const targetHeight = selectedFields[0].pdfHeight;
    selectedFields.forEach(f => updateField(f.id, { pdfHeight: targetHeight }));
  };

  const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedFields.length === 0) return;

    // Find bounding box for alignments
    const minX = Math.min(...selectedFields.map(f => f.pdfX));
    const maxX = Math.max(...selectedFields.map(f => f.pdfX + f.pdfWidth));
    const minY = Math.min(...selectedFields.map(f => f.pdfY - f.pdfHeight));
    const maxY = Math.max(...selectedFields.map(f => f.pdfY));

    selectedFields.forEach(f => {
      switch (type) {
        case 'left':
          updateField(f.id, { pdfX: minX });
          break;
        case 'center':
          updateField(f.id, { pdfX: (minX + maxX) / 2 - f.pdfWidth / 2 });
          break;
        case 'right':
          updateField(f.id, { pdfX: maxX - f.pdfWidth });
          break;
        case 'top':
          updateField(f.id, { pdfY: maxY });
          break;
        case 'middle':
          updateField(f.id, { pdfY: (minY + maxY) / 2 + f.pdfHeight / 2 });
          break;
        case 'bottom':
          updateField(f.id, { pdfY: minY + f.pdfHeight });
          break;
      }
    });
  };

  const handleDistributeHorizontally = () => {
    if (selectedFields.length < 3) return;
    const sorted = [...selectedFields].sort((a, b) => a.pdfX - b.pdfX);
    const minX = sorted[0].pdfX;
    const maxX = sorted[sorted.length - 1].pdfX + sorted[sorted.length - 1].pdfWidth;
    
    // Total width consumed by fields themselves
    const totalFieldWidth = sorted.reduce((sum, f) => sum + f.pdfWidth, 0);
    const totalGapSpace = (maxX - minX) - totalFieldWidth;
    const gap = totalGapSpace / (sorted.length - 1);

    let currentX = minX;
    sorted.forEach((f) => {
      updateField(f.id, { pdfX: currentX });
      currentX += f.pdfWidth + gap;
    });
  };

  const handleDistributeVertically = () => {
    if (selectedFields.length < 3) return;
    // Sort top to bottom (highest pdfY first)
    const sorted = [...selectedFields].sort((a, b) => b.pdfY - a.pdfY);
    const topY = sorted[0].pdfY;
    const bottomY = sorted[sorted.length - 1].pdfY - sorted[sorted.length - 1].pdfHeight;
    
    const totalFieldHeight = sorted.reduce((sum, f) => sum + f.pdfHeight, 0);
    const totalGapSpace = (topY - bottomY) - totalFieldHeight;
    const gap = totalGapSpace / (sorted.length - 1);

    let currentY = topY;
    sorted.forEach((f) => {
      updateField(f.id, { pdfY: currentY });
      currentY -= (f.pdfHeight + gap);
    });
  };

  const handleAdjustWidth = (delta: number) => {
    selectedFields.forEach(f => updateField(f.id, { pdfWidth: Math.max(5, f.pdfWidth + delta) }));
  };

  const handleAdjustHeight = (delta: number) => {
    selectedFields.forEach(f => updateField(f.id, { pdfHeight: Math.max(5, f.pdfHeight + delta) }));
  };

  const handleDistributeHorizontallyAdjust = (delta: number) => {
    if (selectedFields.length < 3) return;
    const sorted = [...selectedFields].sort((a, b) => a.pdfX - b.pdfX);
    const minX = sorted[0].pdfX;
    const maxX = sorted[sorted.length - 1].pdfX + sorted[sorted.length - 1].pdfWidth;
    const totalFieldWidth = sorted.reduce((sum, f) => sum + f.pdfWidth, 0);
    const currentGap = ((maxX - minX) - totalFieldWidth) / (sorted.length - 1);
    
    const newGap = currentGap + delta;
    let currentX = minX;
    sorted.forEach((f) => {
      updateField(f.id, { pdfX: currentX });
      currentX += f.pdfWidth + newGap;
    });
  };

  const handleDistributeVerticallyAdjust = (delta: number) => {
    if (selectedFields.length < 3) return;
    const sorted = [...selectedFields].sort((a, b) => b.pdfY - a.pdfY);
    const topY = sorted[0].pdfY;
    const bottomY = sorted[sorted.length - 1].pdfY - sorted[sorted.length - 1].pdfHeight;
    const totalFieldHeight = sorted.reduce((sum, f) => sum + f.pdfHeight, 0);
    const currentGap = ((topY - bottomY) - totalFieldHeight) / (sorted.length - 1);

    const newGap = currentGap + delta;
    let currentY = topY;
    sorted.forEach((f) => {
      updateField(f.id, { pdfY: currentY });
      currentY -= (f.pdfHeight + newGap);
    });
  };

  const textFields = selectedFields.filter(f => f.type === 'text' || f.type === 'dropdown');

  const handleBulkUpdate = (patch: Partial<FieldDef>) => {
    textFields.forEach(f => updateField(f.id, patch));
  };

  return (
    <div className="space-y-6">
      {textFields.length > 0 && (
        <div className="space-y-4 pb-4 border-b border-zinc-800/60">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{t('sidebar.fieldProperties')}</h3>
          
          {/* Font Size */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-medium text-zinc-500">{t('sidebar.fontSize')}</label>
            </div>
            <input
              type="range"
              min={6}
              max={72}
              step={1}
              value={textFields[0]?.fontSize ?? 12}
              onChange={(e) => handleBulkUpdate({ fontSize: Number(e.target.value) })}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 mb-1.5">{t('sidebar.fontFamily')}</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
              {(['proportional', 'monospace'] as const).map((f) => {
                const isActive = textFields.every(field => (field.fontFamily ?? 'proportional') === f);
                return (
                  <button
                    key={f}
                    onClick={() => handleBulkUpdate({ fontFamily: f })}
                    className={`flex-1 py-1.5 text-xs transition-colors ${
                      isActive ? 'bg-blue-600 text-white font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t(`sidebar.${f}` as const)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Weight */}
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 mb-1.5">{t('sidebar.fontWeight')}</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
              {(['regular', 'bold'] as const).map((w) => {
                const isActive = textFields.every(field => (field.fontWeight ?? 'regular') === w);
                return (
                  <button
                    key={w}
                    onClick={() => handleBulkUpdate({ fontWeight: w })}
                    className={`flex-1 py-1.5 text-xs transition-colors ${
                      isActive ? 'bg-blue-600 text-white font-medium' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {t(`sidebar.${w}` as const)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Align */}
          <div>
            <label className="block text-[10px] font-medium text-zinc-500 mb-1.5">{t('sidebar.textAlign')}</label>
            <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
              {(['left', 'center', 'right'] as const).map((align) => {
                let Icon = null;
                if (align === 'left') Icon = AlignLeft;
                else if (align === 'center') Icon = AlignCenter;
                else if (align === 'right') Icon = AlignRight;
                const isActive = textFields.every(field => (field.textAlign ?? 'left') === align);

                return (
                  <button
                    key={align}
                    onClick={() => handleBulkUpdate({ textAlign: align })}
                    className={`flex-1 flex justify-center items-center py-1.5 transition-colors ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {Icon && <Icon className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Align</h3>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => handleAlign('left')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Left">
            <AlignLeft className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => handleAlign('center')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Center">
            <AlignCenter className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => handleAlign('right')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Right">
            <AlignRight className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => handleAlign('top')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Top">
            <AlignRight className="w-4 h-4 text-zinc-400 -rotate-90" />
          </button>
          <button onClick={() => handleAlign('middle')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Middle">
            <AlignCenter className="w-4 h-4 text-zinc-400 rotate-90" />
          </button>
          <button onClick={() => handleAlign('bottom')} className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border-2 border-zinc-800 flex justify-center transition-colors" title="Align Bottom">
            <AlignLeft className="w-4 h-4 text-zinc-400 -rotate-90" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Match Dimensions</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative flex rounded-lg bg-zinc-900 border-2 border-zinc-800 overflow-hidden">
            <button
              onClick={handleMatchWidth}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-zinc-800 transition-colors"
              title="Match Width"
            >
              <ArrowLeftRight className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 font-medium">Width</span>
            </button>
            <div className="flex flex-col border-l border-zinc-800 w-6 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleAdjustWidth(1); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 text-xs" title="Increase width">+</button>
              <button onClick={(e) => { e.stopPropagation(); handleAdjustWidth(-1); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 border-t border-zinc-800 text-zinc-400 text-xs" title="Decrease width">-</button>
            </div>
          </div>
          <div className="relative flex rounded-lg bg-zinc-900 border-2 border-zinc-800 overflow-hidden">
            <button
              onClick={handleMatchHeight}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-zinc-800 transition-colors"
              title="Match Height"
            >
              <ArrowUpDown className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] text-zinc-500 font-medium">Height</span>
            </button>
            <div className="flex flex-col border-l border-zinc-800 w-6 shrink-0">
              <button onClick={(e) => { e.stopPropagation(); handleAdjustHeight(1); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 text-xs" title="Increase height">+</button>
              <button onClick={(e) => { e.stopPropagation(); handleAdjustHeight(-1); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 border-t border-zinc-800 text-zinc-400 text-xs" title="Decrease height">-</button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Distribute</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className={`relative flex rounded-lg border-2 border-zinc-800 overflow-hidden ${selectedFields.length < 3 ? 'opacity-50 cursor-not-allowed bg-zinc-900' : 'bg-zinc-900'}`}>
            <button
              onClick={handleDistributeHorizontally}
              disabled={selectedFields.length < 3}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-zinc-800 transition-colors disabled:hover:bg-zinc-900"
              title="Distribute Horizontally"
            >
              <Maximize2 className="w-4 h-4 text-zinc-400 rotate-45" />
              <span className="text-[10px] text-zinc-500 font-medium">Horizontal</span>
            </button>
            <div className="flex flex-col border-l border-zinc-800 w-6 shrink-0">
              <button disabled={selectedFields.length < 3} onClick={(e) => { e.stopPropagation(); handleDistributeHorizontallyAdjust(2); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 disabled:hover:bg-transparent text-zinc-400 text-xs" title="Increase spacing">+</button>
              <button disabled={selectedFields.length < 3} onClick={(e) => { e.stopPropagation(); handleDistributeHorizontallyAdjust(-2); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 disabled:hover:bg-transparent border-t border-zinc-800 text-zinc-400 text-xs" title="Decrease spacing">-</button>
            </div>
          </div>
          <div className={`relative flex rounded-lg border-2 border-zinc-800 overflow-hidden ${selectedFields.length < 3 ? 'opacity-50 cursor-not-allowed bg-zinc-900' : 'bg-zinc-900'}`}>
            <button
              onClick={handleDistributeVertically}
              disabled={selectedFields.length < 3}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 p-2 hover:bg-zinc-800 transition-colors disabled:hover:bg-zinc-900"
              title="Distribute Vertically"
            >
              <Maximize2 className="w-4 h-4 text-zinc-400 -rotate-45" />
              <span className="text-[10px] text-zinc-500 font-medium">Vertical</span>
            </button>
            <div className="flex flex-col border-l border-zinc-800 w-6 shrink-0">
              <button disabled={selectedFields.length < 3} onClick={(e) => { e.stopPropagation(); handleDistributeVerticallyAdjust(2); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 disabled:hover:bg-transparent text-zinc-400 text-xs" title="Increase spacing">+</button>
              <button disabled={selectedFields.length < 3} onClick={(e) => { e.stopPropagation(); handleDistributeVerticallyAdjust(-2); }} className="flex-1 flex items-center justify-center hover:bg-zinc-800 disabled:hover:bg-transparent border-t border-zinc-800 text-zinc-400 text-xs" title="Decrease spacing">-</button>
            </div>
          </div>
        </div>
        {selectedFields.length < 3 && (
          <p className="text-[10px] text-zinc-600 text-center mt-1">Requires 3+ fields</p>
        )}
      </div>
      
      <div className="text-center pt-4 border-t border-zinc-800/60 mt-4">
        <p className="text-xs text-blue-400 font-medium">{selectedFields.length} fields selected</p>
      </div>
    </div>
  );
}
