import * as pdfjs from 'pdfjs-dist';
import type { FieldDef } from '../types';
import { initialisePdfJs } from './pdfLoader';

export async function autoDetectFields(pdfBuffer: Uint8Array): Promise<Omit<FieldDef, 'id'>[]> {
  initialisePdfJs();
  const loadingTask = pdfjs.getDocument({ data: pdfBuffer });
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
      // transform is [scaleX, skewY, skewX, scaleY, tx, ty]
      const tx = transform[4];
      const ty = transform[5];
      // @ts-ignore
      const width = item.width || 100;
      // @ts-ignore
      const height = item.height || 14;

      // Find the closest text item to the left or just above to act as label
      let closestText = '';
      let closestDist = Infinity;

      for (const other of textContent.items) {
        if (other === item) continue;
        // @ts-ignore
        const oTransform = other.transform;
        // @ts-ignore
        const oStr = other.str.trim();
        if (!oStr || underscoreRegex.test(oStr)) continue;

        const oTx = oTransform[4];
        const oTy = oTransform[5];

        // Same line (roughly within 10 points y-diff), and to the left
        const isSameLineLeft = Math.abs(oTy - ty) < 10 && oTx < tx;
        // Just above (x overlap, y is greater by 5-30 points)
        const isJustAbove = Math.abs(oTx - tx) < 50 && oTy > ty && (oTy - ty) < 30;

        if (isSameLineLeft || isJustAbove) {
          const dist = isSameLineLeft ? tx - oTx : oTy - ty;
          if (dist < closestDist) {
            closestDist = dist;
            closestText = oStr.replace(/[:.]+$/, ''); // remove trailing colons or dots
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
        pdfX: tx,
        pdfY: ty - 2, // slightly adjust baseline
        pdfWidth: width,
        pdfHeight: Math.max(16, height + 4),
        fontSize: 12,
        fontWeight: 'regular'
      });
    }
  }

  return detectedFields;
}
