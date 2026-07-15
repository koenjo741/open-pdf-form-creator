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
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
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
  return (
    <button
      title={field.tooltip}
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
}

export function TimeFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const alignClass = field.textAlign === 'center' ? 'time-align-center' : field.textAlign === 'right' ? 'time-align-right' : 'time-align-left';

  return (
    <input
      type="time"
      value={field.value || ''}
      onChange={handleChange}
      disabled={isDisabled}
      className={`w-full h-full bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 rounded-sm pointer-events-auto resize-none overflow-hidden ${alignClass} 
        ${field.fontFamily === 'monospace' ? 'font-mono' : 'font-sans'}`}
      style={{
        ...baseStyle,
        textAlign: field.textAlign,
        fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
      }}
    />
  );
}

export function ScaleRatingFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const min = field.scaleMin || 1;
  const max = field.scaleMax || 5;
  const options = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const minLabel = field.scaleMinLabel;
  const maxLabel = field.scaleMaxLabel;

  const customFontSize = field.fontSize ? `${field.fontSize}px` : '10px';

  return (
    <div style={baseStyle} className="w-full h-full flex flex-col justify-center items-center pointer-events-auto px-2 bg-white/50 border border-gray-300">
      <div 
        className="flex justify-between w-full text-gray-500 mb-1"
        style={{ fontSize: customFontSize }}
      >
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
      <div className="flex justify-between w-full items-center">
        {options.map(val => {
          const isSelected = field.value === String(val);
          return (
            <div key={val} className="flex flex-col items-center">
              <div 
                onClick={() => {
                  if (!isDisabled && handleChange) {
                    handleChange({ target: { value: String(val) } } as any);
                  }
                }}
                className={`w-3.5 h-3.5 rounded-full cursor-pointer transition-colors border flex-shrink-0 ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}
              />
              <span 
                className={`mt-1 ${isSelected ? 'text-blue-700 font-bold' : 'text-gray-500'}`}
                style={{ fontSize: field.fontSize ? `${field.fontSize * 0.9}px` : '9px' }}
              >
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function InputTableFieldRenderer({ field, isDisabled, baseStyle }: RendererProps) {
  const { updateField } = useEditorStore();
  const rows = field.tableRows || ['Row 1', 'Row 2'];
  const cols = field.tableCols || ['Col 1', 'Col 2'];
  const inputType = field.tableInputType || 'radio';
  
  const customFontSize = field.fontSize ? `${field.fontSize}px` : '9px';
  const tableValues = field.tableValues || {};

  const handleCellChange = (r: number, c: number, value: any) => {
    if (isDisabled) return;
    const newValues = { ...tableValues };
    if (inputType === 'radio') {
      newValues[`r${r}`] = c;
    } else {
      newValues[`r${r}_c${c}`] = value;
    }
    updateField(field.id, { tableValues: newValues });
  };

  return (
    <div 
      style={{ ...baseStyle, fontSize: customFontSize }} 
      className="w-full h-full flex flex-col pointer-events-auto bg-white border border-gray-300 overflow-hidden"
    >
      <div className="flex w-full bg-gray-100 border-b border-gray-300 font-semibold text-gray-700">
        <div className="flex-[2] border-r border-gray-300 p-0.5"></div>
        {cols.map((col, i) => (
          <div key={i} className="flex-1 text-center p-0.5 truncate border-r border-gray-300 last:border-none flex items-center justify-center">
            {col}
          </div>
        ))}
      </div>
      <div className="flex flex-col flex-1 overflow-y-auto">
        {rows.map((row, r) => (
          <div key={r} className="flex w-full border-b border-gray-200">
            <div className="flex-[2] border-r border-gray-300 p-0.5 truncate font-semibold text-gray-700 flex items-center">
              {row}
            </div>
            {cols.map((_, c) => (
              <div key={c} className="flex-1 border-r border-gray-200 last:border-none flex items-center justify-center p-0.5">
                {inputType === 'radio' && (
                  <input 
                    type="radio" 
                    name={`table-${field.id}-r${r}`} 
                    disabled={isDisabled} 
                    className="w-2.5 h-2.5" 
                    checked={tableValues[`r${r}`] === c}
                    onChange={() => handleCellChange(r, c, c)}
                  />
                )}
                {inputType === 'checkbox' && (
                  <input 
                    type="checkbox" 
                    disabled={isDisabled} 
                    className="w-2.5 h-2.5" 
                    checked={!!tableValues[`r${r}_c${c}`]}
                    onChange={(e) => handleCellChange(r, c, e.target.checked)}
                  />
                )}
                {inputType === 'textbox' && (
                  <input 
                    type="text" 
                    disabled={isDisabled} 
                    className="w-full h-full p-0 border-none bg-transparent focus:outline-none text-center" 
                    value={(tableValues[`r${r}_c${c}`] as string) || ''}
                    onChange={(e) => handleCellChange(r, c, e.target.value)}
                    style={{ 
                      fontSize: 'inherit',
                      fontFamily: field.fontFamily === 'monospace' ? 'monospace' : 'inherit',
                      fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
                      textAlign: field.textAlign || 'left'
                    }} 
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function YesNoFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const yesLabel = field.yesLabel || 'JA';
  const noLabel = field.noLabel || 'NEIN';
  
  const customFontSize = field.fontSize ? `${field.fontSize}px` : '12px';

  return (
    <div style={baseStyle} className="w-full h-full flex items-center justify-around pointer-events-auto bg-white/50 border border-gray-300 px-2">
      
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
        if (!isDisabled && handleChange) {
          handleChange({ target: { value: 'Yes' } } as any);
        }
      }}>
        <span 
          className={`${field.value === 'Yes' ? 'text-blue-700 font-bold' : 'text-gray-500'} select-none`}
          style={{ fontSize: customFontSize }}
        >
          {yesLabel}
        </span>
        <div 
          className={`w-3.5 h-3.5 rounded-full transition-colors border flex-shrink-0 ${
            field.value === 'Yes'
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-gray-300 hover:border-blue-400'
          }`}
        />
      </div>

      <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
        if (!isDisabled && handleChange) {
          handleChange({ target: { value: 'No' } } as any);
        }
      }}>
        <span 
          className={`${field.value === 'No' ? 'text-blue-700 font-bold' : 'text-gray-500'} select-none`}
          style={{ fontSize: customFontSize }}
        >
          {noLabel}
        </span>
        <div 
          className={`w-3.5 h-3.5 rounded-full transition-colors border flex-shrink-0 ${
            field.value === 'No'
              ? 'bg-blue-600 border-blue-600' 
              : 'bg-white border-gray-300 hover:border-blue-400'
          }`}
        />
      </div>

    </div>
  );
}

