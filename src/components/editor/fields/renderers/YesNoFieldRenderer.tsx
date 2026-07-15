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

