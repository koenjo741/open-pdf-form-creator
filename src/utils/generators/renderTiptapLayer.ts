import { PDFPage, PDFFont, rgb } from 'pdf-lib';

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

interface RenderContext {
  page: PDFPage;
  fontRegular: PDFFont;
  fontBold: PDFFont;
  fontItalic: PDFFont;
  fontBoldItalic: PDFFont;
}

export function renderTiptapLayerToPDF(
  page: PDFPage,
  content: TiptapNode,
  fontRegular: PDFFont,
  fontBold: PDFFont,
  // Assuming we might not have italic loaded, we fall back to regular if missing
  fontItalic?: PDFFont,
  fontBoldItalic?: PDFFont
) {
  if (!content || !content.content) return;

  const { width, height } = page.getSize();
  const margin = 24; // 24pt padding from PageEditor
  const availableWidth = width - margin * 2;
  
  let currentY = height - margin; // pdf-lib origin is bottom-left, so we start at top and move down

  const defaultFontSize = 12; // 12pt

  // Helper to split text into lines based on width
  const wrapText = (text: string, font: PDFFont, fontSize: number, maxWidth: number): string[] => {
    const lines: string[] = [];
    const manualLines = text.split('\n');
    
    for (const mLine of manualLines) {
      if (mLine === '') {
        lines.push('');
        continue;
      }
      
      const words = mLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
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
      
      let xOffset = margin;
      let textBuffer = '';
      let currentFont = fontRegular;

      // Extremely simplified renderer: it treats the entire block as one styling for line breaking.
      // A robust WYSIWYG would need to handle mixed marks (bold/italic) inside the same line.
      // For this MVP, we extract all text to calculate wrapping, then draw.
      
      const extractText = (n: TiptapNode): string => {
        if (n.type === 'hardBreak') return '\n';
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

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? rgb(
          parseInt(result[1], 16) / 255,
          parseInt(result[2], 16) / 255,
          parseInt(result[3], 16) / 255
        ) : rgb(0, 0, 0);
      };

      if (!fullText) {
        // Empty paragraph, advance Y by line height PLUS the bottom margin
        currentY -= lineHeight;
        currentY -= isHeading ? 12 : 6;
      } else {
        // For accurate rendering, we should look at the first text node for font style
        if (node.content && node.content.length > 0 && node.content[0].type === 'text') {
          currentFont = determineFont(node.content[0].marks);
          
          // Check for textStyle (FontSize / Color)
          const marks = node.content[0].marks as any[];
          if (marks) {
            const ts = marks.find(m => m.type === 'textStyle');
            if (ts && ts.attrs) {
              if (ts.attrs.fontSize) {
                const parsed = parseInt(ts.attrs.fontSize);
                if (!isNaN(parsed)) blockFontSize = parsed;
              }
              if (ts.attrs.color) {
                blockColor = hexToRgb(ts.attrs.color);
              }
            }
          }
        }

        const actualLineHeight = blockFontSize * lineHeightMultiplier;

        // Adjust Y for the baseline of the first line
        currentY -= blockFontSize; // roughly the ascender height

        const lines = wrapText(fullText, currentFont, blockFontSize, availableWidth);

        lines.forEach((line, index) => {
          let lineX = margin;
          const lineWidth = currentFont.widthOfTextAtSize(line, blockFontSize);

          if (textAlign === 'center') {
            lineX = margin + (availableWidth - lineWidth) / 2;
          } else if (textAlign === 'right') {
            lineX = margin + availableWidth - lineWidth;
          }

          page.drawText(line, {
            x: lineX,
            y: currentY,
            size: blockFontSize,
            font: currentFont,
            color: blockColor,
          });

          // Move down for next line
          if (index < lines.length - 1) {
            currentY -= actualLineHeight;
          }
        });
        
        // Move down for spacing below the paragraph/heading
        currentY -= (actualLineHeight - blockFontSize); // Remaining line height
      }

      // Add fixed spacing after block
      currentY -= isHeading ? 12 : 6;
    } else if (node.type === 'bulletList' || node.type === 'orderedList') {
      node.content?.forEach((listItem, index) => {
        const itemText = listItem.content?.map(p => p.content?.map(t => t.text).join('')).join('') || '';
        const fontSize = defaultFontSize;
        const prefix = node.type === 'bulletList' ? '• ' : `${index + 1}. `;
        const prefixWidth = fontRegular.widthOfTextAtSize(prefix, fontSize);
        
        currentY -= fontSize;
        
        page.drawText(prefix, {
          x: margin + 12,
          y: currentY,
          size: fontSize,
          font: fontRegular,
        });

        const lines = wrapText(itemText, fontRegular, fontSize, availableWidth - 24);
        lines.forEach((line, lIndex) => {
          page.drawText(line, {
            x: margin + 12 + prefixWidth,
            y: currentY,
            size: fontSize,
            font: fontRegular,
          });
          if (lIndex < lines.length - 1) {
            currentY -= fontSize * 1.5;
          }
        });

        currentY -= (fontSize * 1.5 - fontSize);
        currentY -= 6;
      });
    }
  };

  content.content.forEach(renderNode);
}
