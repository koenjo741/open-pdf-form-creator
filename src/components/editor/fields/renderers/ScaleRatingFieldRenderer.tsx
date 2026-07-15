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

