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

