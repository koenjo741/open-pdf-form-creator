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

export function ScribbleRenderer({ field, isDisabled, baseStyle }: Omit<RendererProps, 'handleChange'>) {
  const { updateField } = useEditorStore();
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <button
        style={{ ...baseStyle, backgroundColor: field.value ? 'transparent' : '#f8fafc', border: field.value ? 'none' : '1px dashed #cbd5e1', cursor: isDisabled ? 'not-allowed' : 'pointer', padding: 0 }}
        onClick={() => !isDisabled && setModalOpen(true)}
        disabled={isDisabled}
        tabIndex={field.tabIndex}
      >
        {field.value ? (
          <img src={field.value} alt="Signature" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span className="text-[10px] text-slate-400 font-medium px-2 text-center">
            Klicken zum Signieren
          </span>
        )}
      </button>
      {modalOpen && (
        <ScribbleModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={(dataUri) => {
            updateField(field.id, { value: dataUri });
            setModalOpen(false);
          }}
          initialValue={field.value}
        />
      )}
    </>
  );
}

