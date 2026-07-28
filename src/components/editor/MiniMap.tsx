import { useState, useEffect, useRef } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { usePdfRenderer } from '../../hooks/usePdfRenderer';
import { useEditorStore } from '../../store/useEditorStore';
import { motion } from 'framer-motion';
import { Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MiniMapProps {
  pdfDoc: PDFDocumentProxy;
  numPages: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function MiniMap({ pdfDoc, numPages, containerRef }: MiniMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [hasOpenedBefore, setHasOpenedBefore] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const pageMetas = useEditorStore(s => s.pageMetas);
  const { t } = useTranslation();
  
  // As requested: 1-15 pages = real thumbnails, > 15 pages = stylized numbers
  const renderThumbnails = numPages <= 15;

  const scrollToPage = (index: number) => {
    const el = document.getElementById(`pdf-page-${index}`);
    if (el && containerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleMouseEnter = () => {
    if (!hasOpenedBefore) {
      setIsHovered(true);
      setHasOpenedBefore(true);
    } else {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovered(true);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  return (
    <div
      className="absolute left-0 top-0 bottom-0 z-20 flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Invisible hover trigger zone when collapsed */}
      <div className={`w-6 h-full ${isHovered ? 'bg-transparent' : 'bg-transparent'} absolute left-0 z-10 cursor-pointer flex items-center justify-center`}>
        {!isHovered && (
          <div className="w-1 h-32 bg-slate-300 dark:bg-slate-700 rounded-full opacity-50 hover:opacity-100 transition-opacity" />
        )}
      </div>

      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: isHovered ? 140 : 0, opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="h-full bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-sm border-r border-slate-200 dark:border-slate-800 shadow-2xl overflow-y-auto flex flex-col gap-4 py-6 items-center"
      >
        <div className="flex items-center gap-2 px-2 text-slate-500 dark:text-slate-400 font-medium text-xs uppercase tracking-wider w-full justify-center mb-2 whitespace-nowrap">
          <Layers className="w-4 h-4" />
          <span>{t('editor.pages', 'Pages')}</span>
        </div>
        
        {Array.from({ length: numPages }, (_, i) => {
          const meta = pageMetas.find(m => m.pageIndex === i);
          const ratio = meta ? meta.widthPt / meta.heightPt : 0.7; // default to roughly A4

          return (
            <div 
              key={i} 
              onClick={() => scrollToPage(i)}
              className="flex flex-col items-center gap-1 cursor-pointer group shrink-0"
            >
              <div 
                className="w-20 bg-white dark:bg-slate-800 rounded shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group-hover:border-cyan-500 group-hover:ring-2 group-hover:ring-cyan-500/20 transition-all relative"
                style={{ aspectRatio: ratio }}
              >
                {renderThumbnails ? (
                  <ThumbnailRenderer pdfDoc={pdfDoc} pageIndex={i} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold text-2xl group-hover:text-cyan-500 transition-colors">
                    {i + 1}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-medium group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">
                {i + 1}
              </span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

function ThumbnailRenderer({ pdfDoc, pageIndex }: { pdfDoc: PDFDocumentProxy; pageIndex: number }) {
  const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);

  useEffect(() => {
    let cancelled = false;
    pdfDoc.getPage(pageIndex + 1).then((page) => {
      if (!cancelled) setPageProxy(page);
    });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex]);

  const { canvasRef, isRendering } = usePdfRenderer(pageProxy, pageIndex, 80); // 80px width for thumbnail

  return (
    <>
      <canvas ref={canvasRef} className="w-full h-full object-contain" />
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50">
          <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </>
  );
}
