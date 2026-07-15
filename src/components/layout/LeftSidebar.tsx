import { useTranslation } from 'react-i18next';
import { useEditorStore, useTemporalStore } from '../../store/useEditorStore';
import { Upload, Download, Undo2, Redo2, ChevronDown, FileText, X, Printer, Type, CheckSquare, Circle, Calendar, Hash, Info, Plus, Banknote, CreditCard, AtSign, Link, BadgeCheck, PenTool, QrCode, Send, Lock, Clock, BarChart, Table, ToggleLeft } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from '../common/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { extractAndStripFormFields } from '../../utils/pdfImporter';
import { autoDetectFields } from '../../utils/autoDetectFields';
import { ThemeToggle } from './ThemeToggle';
import { UIScaleToggle } from './UIScaleToggle';
import { FieldListPanel } from './FieldListPanel';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'es', label: 'ES', name: 'Español' },
];

interface LeftSidebarProps {
  onExportEditable: () => void;
  onExportFlattened: () => void;
  onPrint: () => void;
  isExporting: boolean;
}

export function LeftSidebar({ onExportEditable, onExportFlattened, onPrint, isExporting }: LeftSidebarProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPdfBuffer, clearPdf, isLoaded, pdfFileName, pdfFileSize, appMode, setAppMode, sidebarPosition, filenameTemplate, setFilenameTemplate } = useEditorStore();
  const temporalStore = useTemporalStore();
  const [langOpen, setLangOpen] = useState(false);
  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

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
      
      setPdfBuffer(strippedBuffer, file.name, file.size, extractedFields);
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

  const handleAutoDetect = async () => {
    const { pdfBuffer, addFields, fields } = useEditorStore.getState();
    if (!pdfBuffer) return;

    setIsAutoDetecting(true);
    try {
      const detected = await autoDetectFields(pdfBuffer);
      if (detected.length === 0) {
        toast.info('Keine Platzhalter (Unterstriche) im Dokument gefunden.');
        return;
      }
      
      // Prevent duplicates by checking name
      const newFields = detected.filter(df => !fields.some(f => f.name === df.name)).map(df => ({
        ...df,
        id: crypto.randomUUID()
      }));

      if (newFields.length > 0) {
        addFields(newFields);
        toast.success(`${newFields.length} Felder automatisch erkannt und hinzugefügt!`);
      } else {
        toast.info('Felder wurden bereits hinzugefügt.');
      }
    } catch (err) {
      console.error('Failed to auto-detect fields:', err);
      toast.error('Fehler bei der Felderkennung.');
    } finally {
      setIsAutoDetecting(false);
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

          {pdfFileSize > 1500000 && (
            <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md flex gap-2">
              <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-600 dark:text-yellow-500 leading-tight">
                <strong>Hinweis:</strong> Dieses Dokument ist recht groß ({(pdfFileSize / 1024 / 1024).toFixed(1)} MB). 
                Beim Seriendruck kann dies zu sehr großen ZIP-Dateien führen. Komprimiere das PDF idealerweise vorab.
              </p>
            </div>
          )}

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
            <button
              onClick={() => setAppMode('extract')}
              style={{ backgroundColor: appMode === 'extract' ? '#10b981' : 'transparent', color: appMode === 'extract' ? '#fff' : '#94a3b8' }}
              className="flex-1 h-full flex items-center justify-center text-xs font-semibold rounded-md transition-colors"
            >
              Extract
            </button>
          </div>

          {appMode === 'edit' && (
            <div className="mt-2 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-slate-500 uppercase">Export Filename Template</label>
                <div 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help"
                  data-tooltip={t('sidebar.filenameTemplateTip')}
                  data-tooltip-pos="top"
                >
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>
              <input 
                type="text" 
                value={filenameTemplate}
                onChange={(e) => setFilenameTemplate(e.target.value)}
                placeholder="z.B. [Text -- 1]_[Text -- 2, 4]"
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </section>

        {/* Tools Section */}
        {isLoaded && appMode === 'edit' && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tools</h3>
            <div className="relative">
              <button
                onClick={() => setAddFieldOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 h-9 rounded-lg text-xs font-medium transition-colors ${
                  activeTool !== 'select' ? 'bg-cyan-600 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-400 dark:hover:bg-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span>Feld Hinzufügen</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${addFieldOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {addFieldOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.12 }}
                    className="absolute left-0 top-full mt-2 w-full bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-30"
                    onMouseLeave={() => setAddFieldOpen(false)}
                  >
                    {[
                      { id: 'number', label: 'Zahlen', icon: Hash },
                      { id: 'currency', label: 'Währung', icon: Banknote },
                      { id: 'iban', label: 'IBAN', icon: CreditCard },
                      { id: 'text', label: 'Textfeld', icon: Type },
                      { id: 'email', label: 'E-Mail', icon: AtSign },
                      { id: 'url', label: 'URL', icon: Link },
                      { id: 'dropdown', label: 'Dropdown', icon: ChevronDown },
                      { id: 'date', label: 'Datum', icon: Calendar },
                      { id: 'time', label: 'Uhrzeit', icon: Clock },
                      { id: 'scaleRating', label: 'Bewertungsskala', icon: BarChart },
                      { id: 'inputTable', label: 'Eingabetabelle', icon: Table },
                      { id: 'yesNo', label: 'JA / NEIN', icon: ToggleLeft },
                      { id: 'checkbox', label: 'Kontrollkästchen', icon: CheckSquare },
                      { id: 'radio', label: 'Radio', icon: Circle },
                      { id: 'signature', label: 'Signatur (Zertifikat)', icon: BadgeCheck },
                      { id: 'scribble', label: 'Signatur (Zeichnung)', icon: PenTool },
                      { id: 'barcode', label: '2D-Barcode', icon: QrCode },
                      { id: 'button', label: 'Sende-Button', icon: Send },
                      { id: 'lockButton', label: 'Sperren-Button', icon: Lock },
                    ].map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTool(tool.id as any);
                            setAddFieldOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors ${
                            activeTool === tool.id
                              ? 'text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-900/30 font-medium'
                              : 'text-slate-600 hover:bg-slate-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{tool.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Snap to Grid Toggle */}
            <div className="mt-2 flex items-center justify-between px-3 py-2 bg-slate-300 dark:bg-slate-800 rounded-lg">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Am Raster ausrichten</span>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                aria-label={snapToGrid ? 'Snap to grid enabled' : 'Snap to grid disabled'}
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

        {/* Auto Detect Section */}
        {isLoaded && appMode === 'edit' && (
          <section className="flex flex-col gap-3">
            <button
              onClick={handleAutoDetect}
              disabled={isAutoDetecting}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-900 text-sm font-semibold transition-colors shadow-sm"
            >
              <span>{isAutoDetecting ? 'Analysiere...' : '✨ Felder automatisch erkennen'}</span>
            </button>
          </section>
        )}

        {/* Fields Order Section */}
        {isLoaded && appMode === 'edit' && (
          <FieldListPanel />
        )}

        {/* Action Buttons Section */}
        {isLoaded && (
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</h3>
            
            <button
              onClick={() => useEditorStore.getState().setBulkImportModalOpen(true)}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors mb-2"
            >
              <Upload className="w-4 h-4" />
              <span>Import CSV</span>
            </button>

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
              onClick={onPrint}
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
                aria-label="Undo"
                className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-30 transition-colors"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                aria-label="Redo"
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
        <UIScaleToggle />
        
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
                    {lang.label}
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
