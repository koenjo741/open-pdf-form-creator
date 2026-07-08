import { useTranslation } from 'react-i18next';
import { useEditorStore, useTemporalStore } from '../../store/useEditorStore';
import { Upload, Download, Undo2, Redo2, ChevronDown, FileText, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from '../common/Toast';
import { AnimatePresence, motion } from 'framer-motion';
import { extractAndStripFormFields } from '../../utils/pdfImporter';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'es', label: 'ES', name: 'Español' },
];

interface HeaderProps {
  onExportEditable: () => void;
  onExportFlattened: () => void;
  isExporting: boolean;
}

export function Header({ onExportEditable, onExportFlattened, isExporting }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setPdfBuffer, clearPdf, isLoaded, pdfFileName, appMode, setAppMode } = useEditorStore();
  const temporalStore = useTemporalStore();
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const canUndo = temporalStore.getState().pastStates.length > 0;
  const canRedo = temporalStore.getState().futureStates.length > 0;

  const handleUndo = () => temporalStore.getState().undo();
  const handleRedo = () => temporalStore.getState().redo();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    setIsImporting(true);
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      // Extract existing AcroForm fields and strip them from the PDF background
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
    <header className="sticky top-0 z-40 flex items-center gap-2 px-6 h-12 bg-[#020617]/90 backdrop-blur-md border-b border-zinc-800/60">
      {/* Logo (matches 'select' button) */}
      <button className="flex-1 min-w-[200px] max-w-[240px] h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0 cursor-default pointer-events-none transition-colors">
        <FileText className="w-4 h-4 text-white" />
      </button>
      
      {/* Title (matches 'text' button) */}
      <button className="flex-1 min-w-[200px] max-w-[240px] h-8 flex items-center justify-center shrink-0 cursor-default pointer-events-none bg-transparent">
        <span className="font-semibold text-white text-sm hidden sm:block whitespace-nowrap">Open PDF Form Creator</span>
      </button>

      {/* Upload button (matches 'dropdown' button) */}
      <button
        id="header-upload-btn"
        onClick={() => {
          if (!isLoaded && !isImporting) fileInputRef.current?.click();
        }}
        disabled={isLoaded || isImporting}
        className={`flex-1 min-w-[200px] max-w-[240px] flex items-center justify-center gap-2 h-8 rounded-lg text-sm transition-colors border shrink-0 ${
          isLoaded || isImporting
            ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700/30 cursor-not-allowed font-medium'
            : 'bg-[#059669] hover:bg-[#059669]/90 text-white border-[#059669]/50'
        }`}
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:block whitespace-nowrap">
          {isImporting ? 'Importing...' : t('header.upload')}
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleFileChange}
        aria-label={t('header.upload')}
      />

      {/* Close button */}
      {isLoaded && (
        <button
          onClick={clearPdf}
          className="flex-1 min-w-[200px] max-w-[240px] flex items-center justify-center gap-2 h-8 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-500/20 hover:border-red-500/40 shrink-0"
          title={t('header.close')}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:block whitespace-nowrap">{t('header.close')}</span>
        </button>
      )}

      {/* Spacer & Loaded file name */}
      <div className="flex-1 min-w-0 px-2 flex items-center">
        {pdfFileName && (
          <span className="text-zinc-500 text-xs truncate hidden md:block" title={pdfFileName}>
            {pdfFileName}
          </span>
        )}
      </div>

      {/* Mode Toggle Switch */}
      {isLoaded && (
        <div className="flex items-center mr-2 border border-zinc-700/60 rounded-lg p-1 bg-[#0f172a] h-9">
          <button
            onClick={() => setAppMode('edit')}
            style={{ backgroundColor: appMode === 'edit' ? '#FFD700' : 'transparent', color: appMode === 'edit' ? '#000' : '#94a3b8' }}
            className="px-3 h-full flex items-center text-xs font-semibold rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setAppMode('preview')}
            style={{ backgroundColor: appMode === 'preview' ? '#155dfc' : 'transparent', color: appMode === 'preview' ? '#fff' : '#94a3b8' }}
            className="px-3 h-full flex items-center text-xs font-semibold rounded-md transition-colors"
          >
            Preview
          </button>
        </div>
      )}

      {/* Undo / Redo */}
      {isLoaded && appMode === 'edit' && (
        <>
          <button
            id="header-undo-btn"
            onClick={handleUndo}
            disabled={!canUndo}
            title={t('header.undo')}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="header-redo-btn"
            onClick={handleRedo}
            disabled={!canRedo}
            title={t('header.redo')}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Download dropdown */}
      {isLoaded && (
        <div className="relative">
          <button
            id="header-download-btn"
            onClick={() => setDownloadOpen((o) => !o)}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:block">
              {isExporting ? t('export.generating') : t('header.download')}
            </span>
            <ChevronDown className="w-3 h-3" />
          </button>

          <AnimatePresence>
            {downloadOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-52 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-10"
                onMouseLeave={() => setDownloadOpen(false)}
              >
                <button
                  id="download-editable-btn"
                  onClick={() => { setDownloadOpen(false); onExportEditable(); }}
                  className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                >
                  {t('header.downloadEditable')}
                </button>
                <div className="border-t border-zinc-800" />
                <button
                  id="download-finalized-btn"
                  onClick={() => { setDownloadOpen(false); onExportFlattened(); }}
                  className="w-full px-4 py-3 text-left text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
                >
                  {t('header.downloadFinalized')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Language switcher */}
      <div className="relative">
        <button
          id="lang-switcher-btn"
          onClick={() => setLangOpen((o) => !o)}
          className="flex items-center gap-1 px-2.5 py-2 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs font-medium transition-colors border border-zinc-700/40"
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
              className="absolute right-0 top-full mt-2 w-36 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-10"
              onMouseLeave={() => setLangOpen(false)}
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  id={`lang-${lang.code}-btn`}
                  onClick={() => { void i18n.changeLanguage(lang.code); setLangOpen(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                    i18n.language === lang.code
                      ? 'text-blue-400 bg-blue-600/10'
                      : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  {lang.label} — {lang.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </header>
  );
}
