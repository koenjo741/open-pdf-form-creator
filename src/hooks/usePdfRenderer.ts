import { useEffect, useRef, useState, useCallback } from 'react';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { PageMeta } from '../types';

interface UsePdfRendererResult {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isRendering: boolean;
  error: string | null;
  /** Canvas CSS pixel dimensions — updated after render completes */
  canvasDimensions: { width: number; height: number };
  pageMeta: PageMeta | null;
}

/**
 * Renders a single PDF page onto a <canvas> element.
 * Re-renders when pageProxy or containerWidth changes.
 * Returns canvasDimensions as React state so dependents re-render when dimensions change.
 *
 * @param pageProxy      pdfjs PDFPageProxy (null until loaded)
 * @param pageIndex      0-based page index
 * @param containerWidth CSS pixel width of the container (drives scale)
 */
export function usePdfRenderer(
  pageProxy: PDFPageProxy | null,
  pageIndex: number,
  containerWidth: number,
): UsePdfRendererResult {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);

  const render = useCallback(async () => {
    if (!pageProxy || !canvasRef.current || containerWidth <= 0) return;

    // Cancel any in-flight render
    renderTaskRef.current?.cancel();

    setIsRendering(true);
    setError(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const viewport = pageProxy.getViewport({ scale: 1 });
    const scale = containerWidth / viewport.width;
    const scaledViewport = pageProxy.getViewport({ scale });

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = Math.floor(scaledViewport.width);
    const cssHeight = Math.floor(scaledViewport.height);

    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(dpr, dpr);

    setPageMeta({
      pageIndex,
      widthPt: viewport.width,
      heightPt: viewport.height,
    });
    // Signal new dimensions so consumers (PageRenderer) can re-render the overlay
    setCanvasDimensions({ width: cssWidth, height: cssHeight });

    try {
      const renderTask = pageProxy.render({ 
        canvasContext: ctx, 
        viewport: scaledViewport,
        intent: 'print' // Renders values but hides interactive borders
      });
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'Rendering cancelled') return;
      setError(String(e));
    } finally {
      setIsRendering(false);
    }
  }, [pageProxy, pageIndex, containerWidth]);

  useEffect(() => {
    void render();
    return () => renderTaskRef.current?.cancel();
  }, [render]);

  return { canvasRef, isRendering, error, canvasDimensions, pageMeta };
}
