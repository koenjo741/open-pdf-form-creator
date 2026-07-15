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

