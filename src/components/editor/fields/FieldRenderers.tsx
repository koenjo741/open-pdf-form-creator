import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../store/useEditorStore';
import type { FieldDef } from '../../../types';
import { TextValidationModal } from '../../modals/TextValidationModal';
import { DateValidationModal } from '../../modals/DateValidationModal';
import { ScribbleModal } from '../../modals/ScribbleModal';
import { parseDateString, isValidIBAN, isValidEmail, isValidURL, parseNumberStrict } from './FieldValidation';
import { QrCode } from 'lucide-react';

interface RendererProps {
  field: FieldDef;
  isDisabled: boolean;
  baseStyle: React.CSSProperties;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function TextFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const { updateField } = useEditorStore();
  const [validationModal, setValidationModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (validationModal.open) return;
    const val = e.target.value.trim();
    if (!val) return;

    setTimeout(() => {
      if (field.textSubType === 'currency') {
        const num = parseNumberStrict(val.replace(/[^\d.,\-]/g, ''));
        if (!isNaN(num)) {
          const symbol = field.currencySymbol || '€';
          const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' ' + symbol;
          updateField(field.id, { value: formatted });
        }
      } else if (field.textSubType === 'iban') {
        if (!isValidIBAN(val)) {
          setValidationModal({ open: true, title: 'Ungültige IBAN', message: 'Die eingegebene IBAN ist nicht korrekt.' });
        }
      } else if (field.textSubType === 'email') {
        if (!isValidEmail(val)) {
          setValidationModal({ open: true, title: 'Ungültige E-Mail', message: 'Die eingegebene E-Mail-Adresse ist nicht korrekt.' });
        }
      } else if (field.textSubType === 'url') {
        if (!isValidURL(val)) {
          setValidationModal({ open: true, title: 'Ungültige URL', message: 'Die eingegebene URL ist nicht korrekt.' });
        }
      } else if (field.textSubType === 'regex' && field.customRegex) {
        try {
          const re = new RegExp(field.customRegex);
          if (!re.test(val)) {
            setValidationModal({ open: true, title: 'Ungültiges Format', message: field.regexErrorMsg || 'Die Eingabe entspricht nicht dem erforderlichen Format.' });
          }
        } catch (e) {
          console.warn('Invalid regex in field', e);
        }
      }
    }, 250);
  };

  const handleCorrect = () => {
    setValidationModal({ open: false, title: '', message: '' });
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        style={baseStyle}
        value={field.value || ''}
        onChange={handleChange}
        onBlur={handleTextBlur}
        readOnly={isDisabled}
        tabIndex={field.tabIndex}
        className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDisabled ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-white'}`}
      />
      <TextValidationModal
        open={validationModal.open}
        title={validationModal.title}
        message={validationModal.message}
        onCorrect={handleCorrect}
      />
    </>
  );
}

export function DateFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const { i18n } = useTranslation();
  const [validationModal, setValidationModal] = useState<{ open: boolean; type: 'invalid' | 'history' | 'future' | null }>({ open: false, type: null });
  const inputRef = useRef<HTMLInputElement>(null);

  const runValidation = (val: string) => {
    const parsedDate = parseDateString(val, field.dateFormat || 'auto', i18n.language);
    
    if (!parsedDate) {
      setValidationModal({ open: true, type: 'invalid' });
    } else {
      const year = parsedDate.getFullYear();
      if (year < 1900) {
        setValidationModal({ open: true, type: 'history' });
      } else if (year > 2199) {
        setValidationModal({ open: true, type: 'future' });
      }
    }
  };

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (validationModal.open) return;

    const val = e.target.value.trim();
    if (!val) return;

    setTimeout(() => {
      runValidation(val);
    }, 250);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleConfirm = () => {
    setValidationModal({ open: false, type: null });
  };

  const handleCorrect = () => {
    setValidationModal({ open: false, type: null });
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        style={baseStyle}
        value={field.value || ''}
        onChange={handleChange}
        onBlur={handleDateBlur}
        onKeyDown={handleKeyDown}
        readOnly={isDisabled}
        tabIndex={field.tabIndex}
        className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDisabled ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-white'}`}
      />
      <DateValidationModal
        open={validationModal.open}
        type={validationModal.type}
        onConfirm={handleConfirm}
        onCorrect={handleCorrect}
      />
    </>
  );
}

export function DropdownRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  return (
    <select
      style={baseStyle}
      value={field.value || field.defaultOption || ''}
      onChange={handleChange}
      disabled={isDisabled}
      tabIndex={field.tabIndex}
      className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDisabled ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-white'}`}
    >
      <option value=""></option>
      {field.options?.map((opt, i) => (
        <option key={i} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

export function CheckboxRenderer({ field, isDisabled, baseStyle }: Omit<RendererProps, 'handleChange'>) {
  const { updateField } = useEditorStore();
  const isChecked = field.checked ?? field.checkedByDefault ?? false;
  return (
    <div 
      style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none' }}
      onClick={() => { 
        if (!isDisabled) updateField(field.id, { checked: !isChecked }); 
      }}
    >
      <div className={`w-full h-full border-[3px] border-zinc-800 rounded-md flex items-center justify-center bg-white shadow-sm ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        {isChecked && (
          <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" className="w-[80%] h-[80%]">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )}
      </div>
    </div>
  );
}

export function RadioRenderer({ field, isDisabled, baseStyle }: Omit<RendererProps, 'handleChange'>) {
  const { updateField, fields } = useEditorStore();
  const isChecked = field.checked ?? false;
  return (
    <div 
      style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', border: 'none' }}
      onClick={() => {
        if (!isDisabled && !isChecked) {
          fields.forEach(f => {
            if (f.type === 'radio' && (f.groupName || f.name) === (field.groupName || field.name)) {
              updateField(f.id, { checked: f.id === field.id });
            }
          });
        }
      }}
    >
      <div className={`w-full h-full border-[3px] border-zinc-800 rounded-full flex items-center justify-center bg-white shadow-sm ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
        {isChecked && (
          <div className="w-[60%] h-[60%] bg-blue-600 rounded-full"></div>
        )}
      </div>
    </div>
  );
}

export function SignatureRenderer({ baseStyle }: { baseStyle: React.CSSProperties }) {
  return (
    <div style={{ ...baseStyle, backgroundColor: '#f1f5f9', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="text-[10px] text-slate-400 font-medium px-2 text-center leading-tight">
        Kryptografische Signatur<br/>(Acrobat)
      </span>
    </div>
  );
}

export function ScribbleRenderer({ field, isDisabled, baseStyle }: Omit<RendererProps, 'handleChange'>) {
  const { updateField } = useEditorStore();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <button
        style={{ ...baseStyle, backgroundColor: field.value ? 'transparent' : '#f8fafc', border: field.value ? 'none' : '1px dashed #cbd5e1', cursor: isDisabled ? 'not-allowed' : 'pointer', padding: 0 }}
        onClick={() => !isDisabled && setModalOpen(true)}
        disabled={isDisabled}
        tabIndex={field.tabIndex}
      >
        {field.value ? (
          <img src={field.value} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="text-[10px] text-slate-400 font-medium px-2 text-center">
            Klicken zum Signieren
          </span>
        )}
      </button>
      {modalOpen && (
        <ScribbleModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={(dataUri) => {
            updateField(field.id, { value: dataUri });
            setModalOpen(false);
          }}
          initialValue={field.value}
        />
      )}
    </>
  );
}

export function BarcodeRenderer({ field, baseStyle }: { field: FieldDef; baseStyle: React.CSSProperties }) {
  return (
    <div style={{ ...baseStyle, backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <QrCode className="w-8 h-8 text-slate-400 mb-1" />
      <span className="text-[10px] text-slate-400 font-medium px-2 text-center leading-tight">
        {(field as any).barcodeType === 'qrcode' ? 'QR Code' : 'Barcode'}<br/>
        <span className="text-[8px] opacity-75">{field.value || 'Kein Inhalt'}</span>
      </span>
    </div>
  );
}

export function ButtonRenderer({ field, baseStyle, isDisabled, onClick }: { field: FieldDef; baseStyle: React.CSSProperties; isDisabled?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  const content = (
    <button
      style={{
        ...baseStyle,
        backgroundColor: '#e2e8f0',
        border: '1px solid #94a3b8',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: `${field.fontSize || 12}px`,
        fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
        fontFamily: field.fontFamily === 'monospace' ? 'monospace' : 'sans-serif',
      }}
      onClick={(e) => {
        if (!isDisabled && onClick) onClick(e);
      }}
    >
      {field.label || field.name || (field.buttonAction === 'lock' ? 'Sperren' : 'Senden')}
    </button>
  );

  if (field.tooltip) {
    return (
      <div title={field.tooltip} style={{ position: 'absolute', left: baseStyle.left, top: baseStyle.top, width: baseStyle.width, height: baseStyle.height }}>
        {content}
      </div>
    );
  }
  return content;
}
