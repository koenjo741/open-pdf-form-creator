import type { FieldDef } from '../types';

export function calculateAlignUpdates(selectedFields: FieldDef[], type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
  if (selectedFields.length === 0) return [];

  const minX = Math.min(...selectedFields.map(f => f.pdfX));
  const maxX = Math.max(...selectedFields.map(f => f.pdfX + f.pdfWidth));
  const minY = Math.min(...selectedFields.map(f => f.pdfY - f.pdfHeight));
  const maxY = Math.max(...selectedFields.map(f => f.pdfY));

  const updates: { id: string; patch: Partial<FieldDef> }[] = [];
  selectedFields.forEach(f => {
    switch (type) {
      case 'left':
        updates.push({ id: f.id, patch: { pdfX: minX } });
        break;
      case 'center':
        updates.push({ id: f.id, patch: { pdfX: (minX + maxX) / 2 - f.pdfWidth / 2 } });
        break;
      case 'right':
        updates.push({ id: f.id, patch: { pdfX: maxX - f.pdfWidth } });
        break;
      case 'top':
        updates.push({ id: f.id, patch: { pdfY: maxY } });
        break;
      case 'middle':
        updates.push({ id: f.id, patch: { pdfY: (minY + maxY) / 2 + f.pdfHeight / 2 } });
        break;
      case 'bottom':
        updates.push({ id: f.id, patch: { pdfY: minY + f.pdfHeight } });
        break;
    }
  });
  return updates;
}

export function calculateDistributeHorizontallyUpdates(selectedFields: FieldDef[], adjustDelta: number = 0) {
  if (selectedFields.length < 3) return [];
  const sorted = [...selectedFields].sort((a, b) => a.pdfX - b.pdfX);
  const minX = sorted[0].pdfX;
  const maxX = sorted[sorted.length - 1].pdfX + sorted[sorted.length - 1].pdfWidth;
  
  const totalFieldWidth = sorted.reduce((sum, f) => sum + f.pdfWidth, 0);
  const totalGapSpace = (maxX - minX) - totalFieldWidth;
  const gap = (totalGapSpace / (sorted.length - 1)) + adjustDelta;

  const updates: { id: string; patch: Partial<FieldDef> }[] = [];
  let currentX = minX;
  sorted.forEach((f) => {
    updates.push({ id: f.id, patch: { pdfX: currentX } });
    currentX += f.pdfWidth + gap;
  });
  return updates;
}

export function calculateDistributeVerticallyUpdates(selectedFields: FieldDef[], adjustDelta: number = 0) {
  if (selectedFields.length < 3) return [];
  const sorted = [...selectedFields].sort((a, b) => b.pdfY - a.pdfY);
  const topY = sorted[0].pdfY;
  const bottomY = sorted[sorted.length - 1].pdfY - sorted[sorted.length - 1].pdfHeight;
  
  const totalFieldHeight = sorted.reduce((sum, f) => sum + f.pdfHeight, 0);
  const totalGapSpace = (topY - bottomY) - totalFieldHeight;
  const gap = (totalGapSpace / (sorted.length - 1)) + adjustDelta;

  const updates: { id: string; patch: Partial<FieldDef> }[] = [];
  let currentY = topY;
  sorted.forEach((f) => {
    updates.push({ id: f.id, patch: { pdfY: currentY } });
    currentY -= (f.pdfHeight + gap);
  });
  return updates;
}

export function calculateMatchWidthUpdates(selectedFields: FieldDef[]) {
  if (selectedFields.length === 0) return [];
  const targetWidth = selectedFields[0].pdfWidth;
  return selectedFields.map(f => ({ id: f.id, patch: { pdfWidth: targetWidth } }));
}

export function calculateMatchHeightUpdates(selectedFields: FieldDef[]) {
  if (selectedFields.length === 0) return [];
  const targetHeight = selectedFields[0].pdfHeight;
  return selectedFields.map(f => ({ id: f.id, patch: { pdfHeight: targetHeight } }));
}
