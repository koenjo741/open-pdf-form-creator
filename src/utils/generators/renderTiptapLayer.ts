import { PDFPage, PDFFont, rgb } from 'pdf-lib';
import {
  TAB_GRID_SIZE,
  TAB_TOKENS,
  parseLineSegments,
  getDecimalSeparatorIndex,
} from '../text/tabAlignmentUtils';

interface TiptapMark {
  type: string;
}

interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: any;
}

export function renderTiptapLayerToPDF(
  page: PDFPage,
  content: TiptapNode,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  fontItalic?: PDFFont,
  fontBoldItalic?: PDFFont
) {
  if (!content || !content.content) return;

  const { width, height } = page.getSize();
  const margin = 20; // 20pt padding from PageEditor (aligned with 10pt grid)
  const availableWidth = width - margin * 2;
  
  let currentY = height - margin; // pdf-lib origin is bottom-left
  const defaultFontSize = 12; // 12pt

  // Helper to measure width of text considering \t, \u21E5, and \u21E4 tab stops
  const measureLine = (text: string, font: PDFFont, fontSize: number): number => {
    const segments = parseLineSegments(text);
    let lineX = 0;
    for (const seg of segments) {
      const textWidth = font.widthOfTextAtSize(seg.text, fontSize);
      if (seg.tabTypeBefore === 'left') {
        lineX = Math.floor((lineX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE;
        lineX += textWidth;
      } else if (seg.tabTypeBefore === 'right') {
        lineX = Math.max(lineX + textWidth, Math.ceil((lineX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE);
      } else if (seg.tabTypeBefore === 'comma') {
        let textToMeasure = seg.text;
        const commaIdx = getDecimalSeparatorIndex(seg.text);
        if (commaIdx !== -1) {
          textToMeasure = seg.text.substring(0, commaIdx);
        }
        const wBefore = font.widthOfTextAtSize(textToMeasure, fontSize);
        const targetX = Math.max(lineX + wBefore, Math.ceil((lineX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE);
        const remainingText = commaIdx !== -1 ? seg.text.substring(commaIdx) : '';
        lineX = targetX + font.widthOfTextAtSize(remainingText, fontSize);
      } else {
        lineX += textWidth;
      }
    }
    return lineX;
  };

  // Helper for word wrapping
  const wrapText = (text: string, maxWidth: number, font: PDFFont, fontSize: number): string[] => {
    const lines: string[] = [];
    const manualLines = text.split('\n');

    for (const mLine of manualLines) {
      if (!mLine) {
        lines.push('');
        continue;
      }
      
      const words = mLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = measureLine(testLine, font, fontSize);
        if (testWidth > maxWidth && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines;
  };

  const renderNode = (node: TiptapNode) => {
    if (node.type === 'paragraph' || node.type === 'heading') {
      const isHeading = node.type === 'heading';
      const fontSize = isHeading ? (node.attrs?.level === 1 ? 24 : node.attrs?.level === 2 ? 20 : 16) : defaultFontSize;
      const textAlign = node.attrs?.textAlign || 'left';
      const lineHeightMultiplier = parseFloat(node.attrs?.lineHeight || '1.5');
      const lineHeight = fontSize * lineHeightMultiplier;
      
      let currentFont = fontRegular;

      const extractText = (n: TiptapNode): string => {
        if (n.type === 'hardBreak') return '\n';
        if (n.type === 'rightTab') return TAB_TOKENS.RIGHT;
        if (n.type === 'commaTab') return TAB_TOKENS.COMMA;
        if (n.type === 'text' && n.text) return n.text;
        if (n.content) return n.content.map(extractText).join('');
        return '';
      };
      
      const determineFont = (marks?: TiptapMark[]) => {
        if (!marks) return fontRegular;
        const isBold = marks.some(m => m.type === 'bold');
        const isItalic = marks.some(m => m.type === 'italic');
        if (isBold && isItalic && fontBoldItalic) return fontBoldItalic;
        if (isBold) return fontBold;
        if (isItalic && fontItalic) return fontItalic;
        return fontRegular;
      };

      const fullText = extractText(node);
      
      let blockFontSize = fontSize;
      let blockColor = rgb(0, 0, 0);

      // Check first text child for color/font styling
      if (node.content && node.content.length > 0) {
        const firstChild = node.content[0];
        currentFont = determineFont(firstChild.marks);
        if (firstChild.marks) {
          const colorMark = firstChild.marks.find(m => m.type === 'textStyle' && (m as any).attrs?.color);
          if (colorMark && (colorMark as any).attrs?.color) {
            const hex = (colorMark as any).attrs.color.replace('#', '');
            if (hex.length === 6) {
              const r = parseInt(hex.substring(0, 2), 16) / 255;
              const g = parseInt(hex.substring(2, 4), 16) / 255;
              const b = parseInt(hex.substring(4, 6), 16) / 255;
              blockColor = rgb(r, g, b);
            }
          }
        }
      }

      if (fullText.trim() === '' && !fullText.includes('\n')) {
        currentY -= lineHeight;
        return;
      }

      const wrappedLines = wrapText(fullText, availableWidth, currentFont, blockFontSize);

      for (const line of wrappedLines) {
        if (currentY - lineHeight < margin) {
          break;
        }

        if (line) {
          const lineWidth = measureLine(line, currentFont, blockFontSize);
          let lineX = margin;

          if (textAlign === 'center') {
            lineX = margin + (availableWidth - lineWidth) / 2;
          } else if (textAlign === 'right') {
            lineX = margin + availableWidth - lineWidth;
          }

          const segments = parseLineSegments(line);
          let currentSegmentX = lineX;

          segments.forEach((seg) => {
            const textWidth = currentFont.widthOfTextAtSize(seg.text, blockFontSize);
            let drawX = currentSegmentX;

            if (seg.tabTypeBefore === 'left') {
              const relX = currentSegmentX - margin;
              currentSegmentX = margin + Math.floor((relX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE;
              drawX = currentSegmentX;
              currentSegmentX += textWidth;
            } else if (seg.tabTypeBefore === 'right') {
              const relX = currentSegmentX - margin;
              const targetX = margin + Math.max(relX + textWidth, Math.ceil((relX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE);
              drawX = targetX - textWidth;
              currentSegmentX = targetX;
            } else if (seg.tabTypeBefore === 'comma') {
              const relX = currentSegmentX - margin;
              let textToMeasure = seg.text;
              const commaIdx = getDecimalSeparatorIndex(seg.text);
              if (commaIdx !== -1) {
                textToMeasure = seg.text.substring(0, commaIdx);
              }
              const wBefore = currentFont.widthOfTextAtSize(textToMeasure, blockFontSize);
              const targetX = margin + Math.max(relX + wBefore, Math.ceil((relX + TAB_GRID_SIZE) / TAB_GRID_SIZE) * TAB_GRID_SIZE);
              drawX = targetX - wBefore;
              const remainingText = commaIdx !== -1 ? seg.text.substring(commaIdx) : '';
              currentSegmentX = targetX + currentFont.widthOfTextAtSize(remainingText, blockFontSize);
            } else {
              drawX = currentSegmentX;
              currentSegmentX += textWidth;
            }

            if (seg.text) {
              page.drawText(seg.text, {
                x: drawX,
                y: currentY - blockFontSize,
                size: blockFontSize,
                font: currentFont,
                color: blockColor,
              });
            }
          });
        }

        currentY -= lineHeight;
      }

      currentY -= (isHeading ? 12 : 6);
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      if (node.content) {
        node.content.forEach((item, index) => {
          if (item.type === 'listItem' && item.content) {
            item.content.forEach((innerNode) => {
              renderNode(innerNode);
            });
          }
        });
      }
    }
  };

  content.content.forEach((node) => {
    renderNode(node);
  });
}
