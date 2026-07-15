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

