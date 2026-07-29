import * as pdfjs from 'pdfjs-dist';
import type { FieldDef } from '../types';
import { initialisePdfJs } from './pdfLoader';

export async function autoDetectFields(pdfBuffer: Uint8Array): Promise<Omit<FieldDef, 'id'>[]> {
  initialisePdfJs();
  // Slice to guarantee a fresh, non-shared ArrayBuffer, preventing the original 
  // from being detached when transferred to the pdfjs worker.
  const safeCopy = pdfBuffer.slice(0);
  const loadingTask = pdfjs.getDocument({ data: safeCopy });
  const doc = await loadingTask.promise;
  
  const detectedFields: Omit<FieldDef, 'id'>[] = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // We look for items that contain at least 4 underscores
    const underscoreRegex = /_{4,}/g;

    const underscoreItems = textContent.items.filter((item: any) => underscoreRegex.test(item.str));

    for (const item of underscoreItems) {
      // @ts-ignore
      const transform = item.transform;
      const tx = transform[4];
      const ty = transform[5];
      // @ts-ignore
      const fontSize = Math.abs(transform[0]);
      const str = (item as any).str;
      const width = (item as any).width || (str.length * (fontSize * 0.5));
      const height = (item as any).height || fontSize;

      const matches = [...str.matchAll(/_{4,}/g)];

      for (const match of matches) {
        const matchIndex = match.index!;
        const matchLength = match[0].length;

        // Estimate X and width accurately using canvas text measurement
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let matchTx = tx + (matchIndex / str.length) * width;
        let matchWidth = (matchLength / str.length) * width;
        let underscoreDescent = 0;

        if (ctx) {
          ctx.font = `${fontSize}px Helvetica, Arial, sans-serif`;
          const prefixMeasure = ctx.measureText(str.substring(0, matchIndex)).width;
          
          const underscoreMetrics = ctx.measureText(match[0]);
          const underscoreMeasure = underscoreMetrics.width;
          // Some browsers might not support this, so fallback to 1.5 if undefined
          underscoreDescent = underscoreMetrics.actualBoundingBoxDescent ?? 1.5;
          
          // Use exact canvas measurements instead of pdfjs-dist's inaccurate item.width
          matchTx = tx + prefixMeasure;
          matchWidth = underscoreMeasure;
        }

        let closestText = '';

        // 1. Try to find label in the SAME item (text before the underscore)
        const beforeStr = str.substring(0, matchIndex).replace(/_+/g, ' ').trim();
        if (beforeStr) {
           const words = beforeStr.split(/\s+/);
           // Take up to 2 words for better labels like "geb. am"
           const labelWords = words.slice(-2).join(' ');
           closestText = labelWords.replace(/[:.,]+$/, '');
        }

        // 2. If no label found, search other items
        if (!closestText) {
          let closestDist = Infinity;
          for (const other of textContent.items) {
            if (other === item) continue;
            // @ts-ignore
            const oTransform = other.transform;
            // @ts-ignore
            const oStr = other.str.trim();
            if (!oStr || /_{4,}/.test(oStr)) continue;

            const oTx = oTransform[4];
            const oTy = oTransform[5];

            // Same line (roughly within 10 points y-diff), and to the left
            const isSameLineLeft = Math.abs(oTy - ty) < 10 && oTx < matchTx;
            // Just above (x overlap, y is greater by 5-30 points)
            const isJustAbove = Math.abs(oTx - matchTx) < 50 && oTy > ty && (oTy - ty) < 30;

            if (isSameLineLeft || isJustAbove) {
              const dist = isSameLineLeft ? matchTx - oTx : oTy - ty;
              if (dist < closestDist) {
                closestDist = dist;
                closestText = oStr.replace(/[:.,]+$/, '');
              }
            }
          }
        }

        // If no label found, use generic name
        let baseName = closestText || 'Feld';
      baseName = baseName.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F ]/g, '').trim();
      if (!baseName) baseName = 'Feld';

      // Ensure unique name within the detected fields so far
      let finalName = baseName;
      let counter = 1;
      while (detectedFields.some(f => f.name === finalName)) {
        finalName = `${baseName} -- ${counter}`;
        counter++;
      }

      detectedFields.push({
        pageIndex: pageNum - 1,
        type: 'text',
        name: finalName,
        label: finalName,
        pdfX: matchTx,
        pdfY: ty - underscoreDescent,
        pdfWidth: matchWidth,
        pdfHeight: fontSize + underscoreDescent,
        fontSize: 12,
        fontWeight: 'regular'
      });
    }
  }
}

  return detectedFields;
}
