/**
 * Coordinate Mapping Module
 *
 * PDF coordinate system: origin at BOTTOM-LEFT, Y increases UPWARD.
 * Web/CSS coordinate system: origin at TOP-LEFT, Y increases DOWNWARD.
 *
 * All scale factors are computed per-axis independently to handle
 * non-uniform aspect ratios (rare but valid PDFs).
 */

/**
 * Maps a web-canvas position (CSS pixels, top-left origin) to
 * PDF point space (bottom-left origin).
 *
 * Formula:
 *   scaleX = pageWidthPt  / canvasWidthPx
 *   scaleY = pageHeightPt / canvasHeightPx
 *   pdfX = webX * scaleX
 *   pdfY = pageHeightPt - (webY * scaleY)   ← Y-axis inversion
 *
 * @param webX           CSS pixels from the left edge of the rendered canvas
 * @param webY           CSS pixels from the top  edge of the rendered canvas
 * @param pageWidthPt    PDF page width  in points
 * @param pageHeightPt   PDF page height in points
 * @param canvasWidthPx  Rendered canvas width  in CSS pixels
 * @param canvasHeightPx Rendered canvas height in CSS pixels
 */
export function webToPdf(
  webX: number,
  webY: number,
  pageWidthPt: number,
  pageHeightPt: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): { pdfX: number; pdfY: number } {
  const scaleX = pageWidthPt / canvasWidthPx;
  const scaleY = pageHeightPt / canvasHeightPx;
  return {
    pdfX: webX * scaleX,
    pdfY: pageHeightPt - webY * scaleY,
  };
}

/**
 * Maps a PDF point position (bottom-left origin) back to
 * web CSS pixel space (top-left origin).
 *
 * Inverse of {@link webToPdf}.
 *
 * @param pdfX           PDF X coordinate in points
 * @param pdfY           PDF Y coordinate in points (bottom-left origin)
 * @param pageWidthPt    PDF page width  in points
 * @param pageHeightPt   PDF page height in points
 * @param canvasWidthPx  Rendered canvas width  in CSS pixels
 * @param canvasHeightPx Rendered canvas height in CSS pixels
 */
export function pdfToWeb(
  pdfX: number,
  pdfY: number,
  pageWidthPt: number,
  pageHeightPt: number,
  canvasWidthPx: number,
  canvasHeightPx: number,
): { webX: number; webY: number } {
  const scaleX = canvasWidthPx / pageWidthPt;
  const scaleY = canvasHeightPx / pageHeightPt;
  return {
    webX: pdfX * scaleX,
    webY: (pageHeightPt - pdfY) * scaleY,
  };
}

/**
 * Scale a dimension (width or height) from web pixels to PDF points.
 */
export function scaleToPdf(
  webSize: number,
  pageSizePt: number,
  canvasSizePx: number,
): number {
  return webSize * (pageSizePt / canvasSizePx);
}

/**
 * Scale a dimension (width or height) from PDF points to web pixels.
 */
export function scaleToWeb(
  pdfSize: number,
  pageSizePt: number,
  canvasSizePx: number,
): number {
  return pdfSize * (canvasSizePx / pageSizePt);
}
