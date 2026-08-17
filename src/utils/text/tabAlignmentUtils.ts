/**
 * Constants and utilities for multi-type tab stop alignments in free text & PDF export.
 */

export const TAB_GRID_SIZE = 30; // 3 grid cells of 10pt each

export const TAB_TOKENS = {
  LEFT: '\t',
  RIGHT: '\u21E5',
  COMMA: '\u21E4',
} as const;

export type TabType = 'none' | 'left' | 'right' | 'comma';

export interface TextSegment {
  text: string;
  tabTypeBefore: TabType;
}

/**
 * Finds the index of the decimal separator in a number string,
 * taking into account user preference (dot vs comma) when both are present.
 */
export function getDecimalSeparatorIndex(text: string, triggerPromptIfUnset = false): number {
  const hasComma = text.includes(',');
  const hasDot = text.includes('.');

  if (hasComma && hasDot) {
    try {
      const pref = localStorage.getItem('openformpdf_decimal_separator') as 'comma' | 'dot' | null;
      if (!pref) {
        if (triggerPromptIfUnset && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('OPEN_DECIMAL_SEPARATOR_CHOICE'));
        }
        return text.indexOf(',');
      }
      return text.indexOf(pref === 'dot' ? '.' : ',');
    } catch (e) {
      return text.indexOf(',');
    }
  }

  if (hasComma) return text.indexOf(',');
  if (hasDot) return text.indexOf('.');
  return -1;
}

/**
 * Splits a line containing tab tokens into sequential rendered segments.
 */
export function parseLineSegments(lineText: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let currentSegment = '';
  let pendingTabType: TabType = 'none';

  for (let i = 0; i < lineText.length; i++) {
    const char = lineText[i];
    if (char === TAB_TOKENS.LEFT || char === TAB_TOKENS.RIGHT || char === TAB_TOKENS.COMMA) {
      if (currentSegment.length > 0 || pendingTabType !== 'none') {
        segments.push({ text: currentSegment, tabTypeBefore: pendingTabType });
        currentSegment = '';
      }
      if (char === TAB_TOKENS.LEFT) pendingTabType = 'left';
      else if (char === TAB_TOKENS.RIGHT) pendingTabType = 'right';
      else if (char === TAB_TOKENS.COMMA) pendingTabType = 'comma';
    } else {
      currentSegment += char;
    }
  }

  if (currentSegment.length > 0 || pendingTabType !== 'none') {
    segments.push({ text: currentSegment, tabTypeBefore: pendingTabType });
  }

  return segments;
}
