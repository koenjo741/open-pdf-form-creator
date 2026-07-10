import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjs from 'pdfjs-dist';
import { initialisePdfJs } from '../../utils/pdfLoader';
import { useEditorStore } from '../../store/useEditorStore';
import { extractAndStripFormFields } from '../../utils/pdfImporter';
import { PageRenderer } from './PageRenderer';
import { useTranslation } from 'react-i18next';
import { Upload, FileUp } from 'lucide-react';
import { toast } from '../common/Toast';
import type { PageMeta } from '../../types';

export function EditorCanvas() {
  const { t } = useTranslation();
  // Read pdfBuffer as a stable reference — we only re-load when the buffer identity changes
  const pdfBuffer = useEditorStore((s) => s.pdfBuffer);
  const isLoaded = useEditorStore((s) => s.isLoaded);
  const setPageMetas = useEditorStore((s) => s.setPageMetas);
  const setPdfBuffer = useEditorStore((s) => s.setPdfBuffer);

  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(780);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Observe container width for responsive rendering
  useEffect(() => {
    console.log('[DEBUG] EditorCanvas container observer mounted');
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setContainerWidth(Math.min(w - 48, 1200));
    });
    ro.observe(el);
    return () => {
      console.log('[DEBUG] EditorCanvas container observer unmounted');
      ro.disconnect();
    };
  }, []);

  // Load PDF whenever pdfBuffer identity changes.
  useEffect(() => {
    console.log('[DEBUG] EditorCanvas pdfBuffer effect triggered. Buffer present:', !!pdfBuffer);
    if (!pdfBuffer) {
      console.log('[DEBUG] No pdfBuffer. Resetting doc.');
      setPdfDoc(null);
      setNumPages(0);
      return;
    }

    console.log('[DEBUG] Initializing pdfjs...');
    initialisePdfJs();
    let cancelled = false;
    setIsLoadingPdf(true);

    (async () => {
      try {
        console.log('[DEBUG] Starting getDocument task...');
        // Slice to guarantee a fresh, non-shared ArrayBuffer — avoids the
        // "detached ArrayBuffer" pitfall when pdfjs transfers data to its worker.
        const safeCopy = pdfBuffer.slice(0);
        const data = safeCopy; // pass Uint8Array directly — pdfjs prefers this

        const loadingTask = pdfjs.getDocument({ data });
        const doc = await loadingTask.promise;

        if (cancelled) {
          console.log('[DEBUG] getDocument task cancelled. Destroying doc.');
          doc.destroy();
          return;
        }

        console.log('[DEBUG] Document loaded successfully. Pages:', doc.numPages);
        const n = doc.numPages;
        setPdfDoc(doc);
        setNumPages(n);

        // Build page metas (dimensions in PDF points)
        const metas: PageMeta[] = [];
        for (let i = 0; i < n; i++) {
          const page = await doc.getPage(i + 1);
          const vp = page.getViewport({ scale: 1 });
          metas.push({ pageIndex: i, widthPt: vp.width, heightPt: vp.height });
          page.cleanup();
        }

        if (!cancelled) {
          console.log('[DEBUG] Setting page metas in store...', metas);
          setPageMetas(metas);
          // Clear history immediately so loading doesn't count as an unsaved change
          useEditorStore.temporal.getState().clear();
        }
      } catch (err: unknown) {
        console.error('[DEBUG] Error loading document:', err);
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('password') || msg === 'password-protected') {
          toast.error(t('errors.passwordProtected'));
        } else if (msg.includes('Invalid PDF') || msg === 'corrupted') {
          toast.error(t('errors.corrupted'));
        } else {
          toast.error(t('errors.unknown'));
        }
        setPdfDoc(null);
        setNumPages(0);
      } finally {
        if (!cancelled) setIsLoadingPdf(false);
      }
    })();

    return () => {
      console.log('[DEBUG] EditorCanvas pdfBuffer effect cleanup running (cancelled = true)');
      cancelled = true;
      setIsLoadingPdf(false);
    };
    // Only re-run when the buffer reference itself changes, not on every render.
    // setPageMetas / t are intentionally omitted — they are stable store actions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfBuffer]);

  // ── Drag-and-drop on the empty canvas ─────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDraggingOver(true); };
  const handleDragLeave = () => setIsDraggingOver(false);
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'application/pdf') return;
    
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      const { buffer: strippedBuffer, extractedFields } = await extractAndStripFormFields(buffer);
      setPdfBuffer(strippedBuffer, file.name, extractedFields);
      if (extractedFields.length > 0) {
        toast.success(`Imported ${extractedFields.length} existing fields.`);
      }
    } catch (err) {
      console.error('Failed to import PDF via drag and drop:', err);
      toast.error(t('errors.unknown'));
    }
  }, [setPdfBuffer, t]);

  if (!isLoaded) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Empty state / drop zone */}
        <div
          ref={containerRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            flex-1 flex items-center justify-center transition-colors
            ${isDraggingOver ? 'bg-blue-900/10' : ''}
          `}
        >
          <div 
            onClick={() => document.getElementById('header-upload-btn')?.click()}
            className={`
              flex flex-col items-center gap-4 px-12 py-16 rounded-2xl border-2 border-dashed transition-colors cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900/50
              ${isDraggingOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-300 bg-slate-50 dark:border-slate-700/50 dark:bg-slate-900/30'}
            `}
          >
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-colors
              ${isDraggingOver ? 'bg-cyan-600/20' : 'bg-slate-200 dark:bg-slate-800/60'}
            `}>
              {isDraggingOver
                ? <FileUp className="w-8 h-8 text-cyan-500" />
                : <Upload className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              }
            </div>
            <div className="text-center">
              <p className="text-slate-800 dark:text-slate-300 font-medium">{t('editor.uploadPrompt')}</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">{t('editor.uploadPromptSub')}</p>
              <p className="text-slate-500 dark:text-slate-500 text-xs mt-3">{t('editor.dropHere')} · {t('editor.clickToUpload')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div ref={containerRef} className="flex-1 overflow-y-scroll px-6 py-6">
        {/* Loading spinner while PDF is being parsed */}
        {isLoadingPdf && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-zinc-500 text-sm">Loading PDF…</p>
            </div>
          </div>
        )}

        {!isLoadingPdf && pdfDoc && (
          <div className="mx-auto" style={{ width: containerWidth }}>
            <div className="space-y-8">
              {Array.from({ length: numPages }, (_, i) => (
                <div key={i}>
                  {/* Page label */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {t('editor.page')} {i + 1} {t('editor.of')} {numPages}
                    </span>
                    <div className="flex-1 h-px bg-slate-300 dark:bg-slate-800/60" />
                  </div>
                  <PageRenderer
                    pdfDoc={pdfDoc}
                    pageIndex={i}
                    containerWidth={containerWidth}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
