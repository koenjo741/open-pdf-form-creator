// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'dropdown' | 'checkbox' | 'radio' | 'date' | 'signature' | 'scribble' | 'barcode' | 'button';
export type FontWeight = 'regular' | 'bold';

export interface FieldCondition {
  targetFieldId: string;
  condition: 'isChecked' | 'hasValue';
  value?: string;
}

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
  fontFamily?: 'proportional' | 'monospace'; // default 'proportional'
  textAlign?: 'left' | 'center' | 'right'; // default 'left'
  textSubType?: 'text' | 'number' | 'email' | 'currency' | 'iban' | 'url' | 'regex'; // subtype for text fields
  currencySymbol?: string; // Optional currency symbol for currency fields
  calculation?: string; // Optional formula (e.g., "[Feld1] + [Feld2]")
  customRegex?: string; // regex string (e.g., "^[A-Z]{2}-\d{4}$") for regex text fields
  regexErrorMsg?: string; // custom error message if regex validation fails

  // ── Dropdown-specific ──
  options?: string[];
  defaultOption?: string;

  // ── Checkbox-specific ──
  checkedByDefault?: boolean;
  checked?: boolean; // user-entered value

  // ── Radio-specific ──
  /** All radio fields sharing the same groupName form one AcroForm radio group */
  groupName?: string;
  radioValue?: string; // the export value for this button

  // ── User-entered Value (Text/Dropdown/Date) ──
  value?: string;

  // ── Date-specific ──
  /** 'auto' to use navigator.language, or explicitly 'DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD' */
  dateFormat?: string;

  // ── Barcode-specific ──
  barcodeFormat?: 'qrcode' | 'pdf417';

  // ── Button-specific (Submit) ──
  submitUrl?: string;
  buttonAction?: 'submit' | 'lock';

  // ── Tab Order ──
  tabIndex?: number;

  // ── Validation ──
  isRequired?: boolean;

  // ── Conditional Logic ──
  enableCondition?: FieldCondition;
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

export type ToolMode = FieldType | 'select' | 'number' | 'currency' | 'iban' | 'email' | 'url' | 'regex' | 'lockButton';

// ─── App Mode ────────────────────────────────────────────────────────────────

export type AppMode = 'edit' | 'preview' | 'extract';
