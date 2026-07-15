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
  return (
    <button
      title={field.tooltip}
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

