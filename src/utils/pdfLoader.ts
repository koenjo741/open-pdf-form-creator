/**
 * PDF.js initialisation helper.
 *
 * Sets the worker source using import.meta.url so Vite bundles it locally
 * (zero CDN calls). Must be called once before any getDocument() call.
 */
import * as pdfjs from 'pdfjs-dist';

let initialised = false;

export function initialisePdfJs(): void {
  if (initialised) return;
  // Vite resolves this URL at build time and copies the worker into the output bundle
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  initialised = true;
}

export type PdfLoadError = 'password-protected' | 'corrupted' | 'unknown';

export interface LoadedPdf {
  document: pdfjs.PDFDocumentProxy;
  numPages: number;
}

/**
 * Load a PDF from an ArrayBuffer.
 * Throws a typed error string so the UI can show a meaningful message.
 */
export async function loadPdf(buffer: ArrayBuffer): Promise<LoadedPdf> {
  initialisePdfJs();
  try {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjs.getDocument({ data });
    const doc = await loadingTask.promise;
    return { document: doc, numPages: doc.numPages };
  } catch (err: unknown) {
    if (err instanceof Error) {
      // pdf.js wraps errors — inspect the name field
      if (err.name === 'PasswordException' || err.message?.includes('password')) {
        throw new Error('password-protected' satisfies PdfLoadError);
      }
      if (
        err.name === 'InvalidPDFException' ||
        err.message?.includes('Invalid PDF')
      ) {
        throw new Error('corrupted' satisfies PdfLoadError);
      }
    }
    throw new Error('unknown' satisfies PdfLoadError);
  }
}
