import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../../store/useEditorStore';
import type { FieldDef } from '../../../../types';
import { TextValidationModal } from '../../../modals/TextValidationModal';
import { DateValidationModal } from '../../../modals/DateValidationModal';
import { ScribbleModal } from '../../../modals/ScribbleModal';
import { parseDateString, isValidIBAN, isValidEmail, isValidURL, parseNumberStrict } from '../FieldValidation';
import { QrCode } from 'lucide-react';

export interface RendererProps {
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

