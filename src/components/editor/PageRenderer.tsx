import { useEffect, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { usePdfRenderer } from '../../hooks/usePdfRenderer';
import { FieldOverlay } from './FieldOverlay';
import { useEditorStore } from '../../store/useEditorStore';

interface PageRendererProps {
  pdfDoc: PDFDocumentProxy;
  pageIndex: number;      // 0-based
  containerWidth: number;
}

export function PageRenderer({ pdfDoc, pageIndex, containerWidth }: PageRendererProps) {
  const [pageProxy, setPageProxy] = useState<PDFPageProxy | null>(null);
  // Read only this page's meta from the store (set by EditorCanvas after load)
  const pageMeta = useEditorStore((s) =>
    s.pageMetas.find((m) => m.pageIndex === pageIndex) ?? null,
  );

  useEffect(() => {
    let cancelled = false;
    pdfDoc.getPage(pageIndex + 1).then((page) => {
      if (!cancelled) setPageProxy(page);
    });
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageIndex]);

  const { canvasRef, isRendering, error, canvasDimensions } = usePdfRenderer(
    pageProxy,
    pageIndex,
    containerWidth,
  );

  const canvasW = canvasDimensions.width || containerWidth;
  const canvasH = canvasDimensions.height;

  return (
    <div className="relative select-none">
      {/* PDF Canvas */}
      <canvas
        ref={canvasRef}
        className="block rounded-sm shadow-xl"
        aria-label={`PDF page ${pageIndex + 1}`}
      />

      {/* Loading spinner overlay */}
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/40 rounded-sm">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 rounded-sm">
          <p className="text-red-400 text-sm px-4 text-center">{error}</p>
        </div>
      )}

      {/* Field interaction overlay — only mounted once canvas has dimensions */}
      {pageMeta && canvasW > 0 && canvasH > 0 && (
        <FieldOverlay
          pageMeta={pageMeta}
          canvasWidth={canvasW}
          canvasHeight={canvasH}
        />
      )}
    </div>
  );
}
