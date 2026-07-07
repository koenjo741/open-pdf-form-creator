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
  const { setPdfBuffer, clearPdf, isLoaded, pdfFileName, fields } = useEditorStore();
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
    <header className="sticky top-0 z-40 flex items-center gap-3 px-4 py-3 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/60">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-2">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-white text-sm hidden sm:block">OpenFormPDF</span>
      </div>

      {/* Upload button */}
      <button
        id="header-upload-btn"
        onClick={() => {
          if (!isLoaded && !isImporting) fileInputRef.current?.click();
        }}
        disabled={isLoaded || isImporting}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
          isLoaded || isImporting
            ? 'bg-zinc-800/50 text-zinc-600 border-zinc-700/30 cursor-not-allowed'
            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700/50'
        }`}
      >
        <Upload className="w-4 h-4" />
        <span className="hidden sm:block">
          {isImporting ? 'Importing...' : isLoaded ? t('header.uploadNew') : t('header.upload')}
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
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 text-sm font-medium transition-colors border border-red-500/20 hover:border-red-500/40"
          title={t('header.close')}
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:block">{t('header.close')}</span>
        </button>
      )}

      {/* Loaded file name */}
      {pdfFileName && (
        <span className="text-zinc-500 text-xs truncate max-w-[120px] hidden md:block">
          {pdfFileName}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo / Redo */}
      {isLoaded && (
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
