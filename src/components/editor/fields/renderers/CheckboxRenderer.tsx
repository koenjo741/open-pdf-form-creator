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

