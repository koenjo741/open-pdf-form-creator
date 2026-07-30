import { PDFDocument } from 'pdf-lib';

/**
 * Resizes all pages in the given PDF buffer to the specified width and height.
 * 
 * @param pdfBuffer The original PDF document as a Uint8Array.
 * @param widthPt The new width in PDF points.
 * @param heightPt The new height in PDF points.
 * @returns A Promise resolving to the new PDF document as a Uint8Array.
 */
export async function resizePdfPages(pdfBuffer: Uint8Array, widthPt: number, heightPt: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  
  const pages = pdfDoc.getPages();
  for (const page of pages) {
    page.setSize(widthPt, heightPt);
  }
  
  return await pdfDoc.save();
}
