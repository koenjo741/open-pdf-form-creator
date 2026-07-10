import { useTranslation } from 'react-i18next';
import { useEditorStore, useTemporalStore } from '../../store/useEditorStore';
import { Upload, Download, Undo2, Redo2, ChevronDown, FileText, X, Printer, Type, CheckSquare, Circle, MousePointer, Calendar, Hash, Image } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from '../common/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { extractAndStripFormFields } from '../../utils/pdfImporter';
import { ThemeToggle } from './ThemeToggle';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'es', label: 'ES', name: 'Español' },
];

interface LeftSidebarProps {
  onExportEditable: () => void;
  onExportFlattened: () => void;
  isExporting: boolean;
}

export function LeftSidebar({ onExportEditable, onExportFlattened, isExporting }: LeftSidebarProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPdfBuffer, clearPdf, isLoaded, pdfFileName, appMode, setAppMode, sidebarPosition } = useEditorStore();
  const temporalStore = useTemporalStore();
  const [langOpen, setLangOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const canUndo = temporalStore.getState().pastStates.length > 0;
  const canRedo = temporalStore.getState().futureStates.length > 0;

  const { activeTool, setActiveTool, snapToGrid, setSnapToGrid } = useEditorStore();

  const handleUndo = () => temporalStore.getState().undo();
  const handleRedo = () => temporalStore.getState().redo();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    setIsImporting(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { buffer: strippedBuffer, extractedFields } = await extractAndStripFormFields(buffer);
      
      setPdfBuffer(strippedBuffer, file.name, extractedFields);
      if (extractedFields.length > 0) {
        toast.success(`Imported ${extractedFields.length} existing fields.`);
      } else {
        toast.error('No form fields found in the PDF.');
      }
    } catch (err) {
      console.error('Failed to import PDF fields:', err);
      toast.error(t('errors.unknown'));
    } finally {
      setIsImporting(false);
    }
  };

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <aside className={`w-64 shrink-0 flex flex-col bg-slate-200 dark:bg-slate-900/95 ${sidebarPosition === 'right' ? 'border-r' : 'border-l'} border-slate-200 dark:border-slate-800 overflow-hidden relative z-20`}>
      {/* App Title Header */}
      <div className="px-4 h-12 flex items-center justify-between bg-slate-400/40 dark:bg-slate-800/40 border-b border-slate-300 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
            Open PDF Form Creator
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-6">
        
        {/* Document Section */}
        <section className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document</h3>
          
          <button
            id="sidebar-upload-btn"
            onClick={() => {
              if (!isLoaded && !isImporting) fileInputRef.current?.click();
            }}
            disabled={isLoaded || isImporting}
            className={`w-full flex items-center justify-center gap-2 h-9 rounded-lg text-sm transition-colors border ${
              isLoaded || isImporting
                ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700/30 cursor-not-allowed font-medium'
                : 'bg-[#059669] hover:bg-[#059669]/90 text-white border-[#059669]/50'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{isImporting ? 'Importing...' : t('header.upload')}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
            aria-label={t('header.upload')}
          />
          
          {pdfFileName && (
            <div className="text-xs text-slate-500 truncate mt-1" data-tooltip={pdfFileName}>
              {pdfFileName}
            </div>
          )}

          {isLoaded && (
            <div className="flex border border-slate-300 dark:border-slate-700/60 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 h-9">
              <button
                onClick={() => setAppMode('edit')}
                style={{ backgroundColor: appMode === 'edit' ? '#FFD700' : 'transparent', color: appMode === 'edit' ? '#000' : '#94a3b8' }}
                className="flex-1 h-full flex items-center justify-center text-xs font-semibold rounded-md transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setAppMode('preview')}
                style={{ backgroundColor: appMode === 'preview' ? '#06b6d4' : 'transparent', color: appMode === 'preview' ? '#fff' : '#94a3b8' }}
                className="flex-1 h-full flex items-center justify-center text-xs font-semibold rounded-md transition-colors"
              >
                Preview
              </button>
            </div>
          )}
        </section>

        {/* Tools Section */}
        {isLoaded && appMode === 'edit' && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTool('number')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'number' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Hash className="w-4 h-4 shrink-0" />
                <span className="truncate">Zahlen</span>
              </button>
              
              <button
                onClick={() => setActiveTool('text')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'text' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Type className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('tools.text')}</span>
              </button>

              <button
                onClick={() => setActiveTool('dropdown')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'dropdown' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <ChevronDown className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('tools.dropdown')}</span>
              </button>

              <button
                onClick={() => setActiveTool('date')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'date' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('tools.date')}</span>
              </button>

              <button
                onClick={() => setActiveTool('checkbox')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'checkbox' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <CheckSquare className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('tools.checkbox')}</span>
              </button>

              <button
                onClick={() => setActiveTool('radio')}
                className={`flex items-center gap-2 px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool === 'radio' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <Circle className="w-4 h-4 shrink-0" />
                <span className="truncate">{t('tools.radio')}</span>
              </button>
              
            </div>
            
            {/* Snap to Grid Toggle */}
            <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-300 dark:bg-slate-800 rounded-lg">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Am Raster ausrichten</span>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                  snapToGrid ? 'bg-cyan-600' : 'bg-slate-400 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    snapToGrid ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {/* Action Buttons Section */}
        {isLoaded && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</h3>
            
            <button
              onClick={() => onExportEditable()}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('header.saveEditable')}</span>
            </button>
            
            <button
              onClick={() => onExportFlattened()}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-[#059669] hover:bg-[#059669]/90 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>{t('header.saveFinalized')}</span>
            </button>

            <button
              onClick={() => window.print()}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-300 dark:bg-slate-800 hover:bg-slate-400 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Document</span>
            </button>
            
            <button
              onClick={clearPdf}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-500 text-sm font-medium transition-colors border border-red-500/20"
            >
              <X className="w-4 h-4" />
              <span>Reset / Close</span>
            </button>
          </section>
        )}

        {/* Undo/Redo */}
        {isLoaded && appMode === 'edit' && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">History</h3>
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Footer Settings */}
      <div className="mt-auto px-4 py-4 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <ThemeToggle />
        
        <div className="relative flex-1">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
          >
            {currentLang.label}
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.12 }}
                className="absolute left-0 bottom-full mb-2 w-full bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-10"
                onMouseLeave={() => setLangOpen(false)}
              >
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => { void i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full px-4 py-2 text-left text-xs transition-colors ${
                      i18n.language === lang.code
                        ? 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-600/10'
                        : 'text-slate-600 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {lang.label} - {lang.name}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  );
}
