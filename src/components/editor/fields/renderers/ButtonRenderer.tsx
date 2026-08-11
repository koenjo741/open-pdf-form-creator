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

export function ButtonRenderer({ field, baseStyle, isDisabled, onClick }: { field: FieldDef; baseStyle: React.CSSProperties; isDisabled?: boolean; onClick?: (e: React.MouseEvent) => void }) {
  const { t } = useTranslation();
  
  if (field.buttonAction === 'saveWidget') {
    return (
      <div
        data-tooltip={field.tooltip}
        style={{
          ...baseStyle,
          backgroundColor: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ flex: 1, padding: '4px 8px', fontSize: '10px', color: '#334155', textAlign: 'justify', overflowY: 'auto' }}>
          {t('fields.saveWidgetExplainer')}
        </div>
        <div style={{ display: 'flex', height: '30px', borderTop: '1px solid #cbd5e1' }}>
          <button
            style={{
              flex: 1, border: '1px solid #0091b7', backgroundColor: '#d9eef4', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 'bold'
            }}
            onClick={(e) => { if (!isDisabled && onClick) onClick(e); }}
          >
            {t('fields.saveWidgetEditable')}
          </button>
          <button
            style={{
              flex: 1, border: '1px solid #059669', backgroundColor: '#daefe9', cursor: isDisabled ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: 'bold'
            }}
            onClick={(e) => { if (!isDisabled && onClick) onClick(e); }}
          >
            {t('fields.saveWidgetReadonly')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      data-tooltip={field.tooltip}
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
