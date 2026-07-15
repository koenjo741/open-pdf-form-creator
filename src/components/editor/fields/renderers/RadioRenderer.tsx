import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../../../store/useEditorStore';
import type { FieldDef } from '../../../../types';
import { TextValidationModal } from '../../../modals/TextValidationModal';
import { DateValidationModal } from '../../../modals/DateValidationModal';
import { ScribbleModal } from '../../../modals/ScribbleModal';
import { parseDateString, isValidIBAN, isValidEmail, isValidURL, parseNumberStrict } from '../FieldValidation';

export interface RendererProps {
  field: FieldDef;
  isDisabled: boolean;
  baseStyle: React.CSSProperties;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
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

