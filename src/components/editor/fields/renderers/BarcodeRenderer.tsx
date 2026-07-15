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

export function BarcodeRenderer({ field, baseStyle }: { field: FieldDef; baseStyle: React.CSSProperties }) {
  return (
    <div style={{ ...baseStyle, backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <QrCode className="w-8 h-8 text-slate-400 mb-1" />
      <span className="text-[10px] text-slate-400 font-medium px-2 text-center leading-tight">
        {(field as any).barcodeType === 'qrcode' ? 'QR Code' : 'Barcode'}<br/>
        <span className="text-[8px] opacity-75">{field.value || 'Kein Inhalt'}</span>
      </span>
    </div>
  );
}

