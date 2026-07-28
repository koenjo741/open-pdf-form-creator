import React, { useRef, useState, useEffect } from 'react';
import { useEditorStore } from '../../../../store/useEditorStore';
import type { FieldDef } from '../../../../types';
import { TextValidationModal } from '../../../modals/TextValidationModal';
import { isValidIBAN, isValidEmail, isValidURL, parseNumberStrict } from '../FieldValidation';

export interface RendererProps {
  field: FieldDef;
  isDisabled: boolean;
  baseStyle: React.CSSProperties;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const formatIBAN = (val: string) => {
  if (!val) return '';
  const clean = val.replace(/[\W_]+/g, '').toUpperCase();
  const match = clean.match(/.{1,4}/g);
  return match ? match.join(' ') : clean;
};

export function TextFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const { updateField } = useEditorStore();
  const [validationModal, setValidationModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Local state for cursor management to prevent jumping when formatting IBAN
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  useEffect(() => {
    if (cursorPos !== null && inputRef.current) {
      inputRef.current.setSelectionRange(cursorPos, cursorPos);
      setCursorPos(null);
    }
  }, [field.value, cursorPos]);

  const onLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (field.textSubType === 'iban') {
      const input = e.target;
      const rawValue = input.value;
      const selectionStart = input.selectionStart || 0;
      
      const cleanVal = rawValue.replace(/[\W_]+/g, '').toUpperCase();
      
      // Calculate new cursor position based on spaces
      const formattedBeforeCursor = formatIBAN(rawValue.substring(0, selectionStart));
      setCursorPos(formattedBeforeCursor.length);

      if (handleChange) {
         const synthEvent = { 
           ...e, 
           target: { ...e.target, value: cleanVal } 
         };
         handleChange(synthEvent as any);
      } else {
         updateField(field.id, { value: cleanVal });
      }
    } else {
      handleChange?.(e);
    }
  };

  const handleTextBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (validationModal.open) return;
    const val = e.target.value.trim();
    // For IBAN we want to validate the clean value, not the formatted one
    const cleanValForValidation = field.textSubType === 'iban' ? val.replace(/[\W_]+/g, '').toUpperCase() : val;
    if (!cleanValForValidation && !val) return;

    setTimeout(() => {
      if (field.textSubType === 'number') {
        const num = parseNumberStrict(val);
        if (isNaN(num)) {
          setValidationModal({ open: true, title: 'Ungültige Zahl', message: 'Bitte eine gültige Zahl eingeben.' });
        }
      } else if (field.textSubType === 'currency') {
        const num = parseNumberStrict(val.replace(/[^\d.,\-]/g, ''));
        if (isNaN(num)) {
          setValidationModal({ open: true, title: 'Ungültiger Betrag', message: 'Bitte einen gültigen Geldbetrag eingeben.' });
        } else {
          const symbol = field.currencySymbol || '€';
          const formatted = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + ' ' + symbol;
          updateField(field.id, { value: formatted });
        }
      } else if (field.textSubType === 'iban') {
        if (!isValidIBAN(cleanValForValidation)) {
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
  
  const displayValue = field.textSubType === 'iban' 
    ? formatIBAN(field.value || '') 
    : (field.value || '');

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        style={baseStyle}
        value={displayValue}
        onChange={onLocalChange}
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

