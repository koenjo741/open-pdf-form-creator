// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'radio';
export type FontWeight = 'regular' | 'bold';

export interface FieldDef {
  id: string;           // uuid v4
  pageIndex: number;    // 0-based page index
  type: FieldType;
  /** Unique AcroForm field name — enforced by store */
  name: string;
  /** Human-readable label shown in the overlay */
  label: string;

  // ── Position & Size in PDF point space (origin: bottom-left) ──
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;

  // ── Text / Dropdown shared ──
  fontSize?: number;       // pt, default 12
  fontWeight?: FontWeight; // default 'regular'

  // ── Dropdown-specific ──
  options?: string[];
  defaultOption?: string;

  // ── Checkbox-specific ──
  checkedByDefault?: boolean;

  // ── Radio-specific ──
  /** All radio fields sharing the same groupName form one AcroForm radio group */
  groupName?: string;
  radioValue?: string; // the export value for this button
}

// ─── Page Metadata ───────────────────────────────────────────────────────────

export interface PageMeta {
  pageIndex: number;
  /** PDF page width in points */
  widthPt: number;
  /** PDF page height in points */
  heightPt: number;
}

// ─── Coordinate Mapping ──────────────────────────────────────────────────────

export interface WebCoords {
  webX: number;
  webY: number;
}

export interface PdfCoords {
  pdfX: number;
  pdfY: number;
}

// ─── Export Options ──────────────────────────────────────────────────────────

export type ExportMode = 'editable' | 'flattened';

// ─── Tool Mode ───────────────────────────────────────────────────────────────

export type ToolMode = FieldType | 'select';
