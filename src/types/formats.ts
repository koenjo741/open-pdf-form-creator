export const MM_TO_PT = 72 / 25.4;

export interface PageFormat {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const PAGE_FORMATS: PageFormat[] = [
  { id: 'A4', label: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  { id: 'A5', label: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210 },
  { id: 'A6', label: 'A6 (105 × 148 mm)', widthMm: 105, heightMm: 148 },
  { id: 'A7', label: 'A7 (74 × 105 mm)', widthMm: 74, heightMm: 105 },
  { id: 'A8', label: 'A8 (52 × 74 mm)', widthMm: 52, heightMm: 74 },
  { id: 'B4', label: 'B4 (250 × 353 mm)', widthMm: 250, heightMm: 353 },
  { id: 'B5', label: 'B5 (176 × 250 mm)', widthMm: 176, heightMm: 250 },
  { id: 'B6', label: 'B6 (125 × 176 mm)', widthMm: 125, heightMm: 176 },
  { id: 'C4', label: 'C4 (229 × 324 mm)', widthMm: 229, heightMm: 324 },
  { id: 'C5', label: 'C5 (162 × 229 mm)', widthMm: 162, heightMm: 229 },
  { id: 'C6', label: 'C6 (114 × 162 mm)', widthMm: 114, heightMm: 162 },
  { id: 'Letter', label: 'US Letter (8.5 × 11 in)', widthMm: 215.9, heightMm: 279.4 },
  { id: 'Legal', label: 'US Legal (8.5 × 14 in)', widthMm: 215.9, heightMm: 355.6 },
  { id: 'Tabloid', label: 'US Tabloid (11 × 17 in)', widthMm: 279.4, heightMm: 431.8 },
  { id: 'Custom', label: 'Frei wählbar...', widthMm: 210, heightMm: 297 },
];
