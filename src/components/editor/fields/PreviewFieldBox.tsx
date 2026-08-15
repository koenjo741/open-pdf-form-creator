import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { pdfToWeb } from '../../../utils/coordinateMapper';
import type { FieldDef, PageMeta } from '../../../types';
import { toast } from '../../common/Toast';
import {
  TextFieldRenderer,
  TextareaFieldRenderer,
  DateFieldRenderer,
  DropdownRenderer,
  CheckboxRenderer,
  RadioRenderer,
  SignatureRenderer,
  ScribbleRenderer,
  BarcodeRenderer,
  ButtonRenderer,
  TimeFieldRenderer,
  ScaleRatingFieldRenderer,
  InputTableFieldRenderer,
  YesNoFieldRenderer
} from './renderers';

export interface PreviewFieldBoxProps {
  field: FieldDef;
  pageMeta: PageMeta;
  canvasWidth: number;
  canvasHeight: number;
}

export function PreviewFieldBox({ field, pageMeta, canvasWidth, canvasHeight }: PreviewFieldBoxProps) {
  const { updateField, fields } = useEditorStore();

  // Find if this is a duplicate (i.e. not the first field with this name)
  const isDuplicate = fields.find(f => f.name === field.name)?.id !== field.id;

  let isGreyedOut = false;
  if (field.enableCondition) {
    const ctrlField = fields.find(f => f.id === field.enableCondition!.targetFieldId);
    if (ctrlField) {
      if (field.enableCondition.condition === 'isChecked') {
        const isChecked = ctrlField.checked ?? ctrlField.checkedByDefault ?? false;
        if (!isChecked) isGreyedOut = true;
      } else {
        let val = field.enableCondition.value || '';
        if (ctrlField.type === 'radio') {
          val = ctrlField.radioValue || ctrlField.id.slice(0, 8);
        }
        let ctrlVal = ctrlField.value || '';
        if (ctrlField.type === 'radio') {
          // If the control field is a radio button, its value is its radioValue if checked, otherwise it's 'Off' or empty.
          // But actually, the PDF uses the group value. For the preview, if THIS radio button is checked, 
          // we treat its ctrlVal as its radioValue. If it's not checked, we check if another radio in the group is checked.
          if (ctrlField.checked) {
            ctrlVal = ctrlField.radioValue || ctrlField.id.slice(0, 8);
          } else {
            // Check if any other radio in the same group is checked
            const groupChecked = fields.find(f => f.type === 'radio' && (f.groupName || f.name) === (ctrlField.groupName || ctrlField.name) && f.checked);
            ctrlVal = groupChecked ? (groupChecked.radioValue || groupChecked.id.slice(0, 8)) : 'Off';
          }
        }
        
        if (val === '*') {
          if (!ctrlVal || ctrlVal === 'Off') isGreyedOut = true;
        } else {
          if (ctrlVal !== val) isGreyedOut = true;
        }
      }
    }
  }

  const isDisabled = isDuplicate || isGreyedOut;

  const { webX, webY } = pdfToWeb(
    field.pdfX, field.pdfY + field.pdfHeight,
    pageMeta.widthPt, pageMeta.heightPt,
    canvasWidth, canvasHeight,
  );
  const webW = (field.pdfWidth / pageMeta.widthPt) * canvasWidth;
  const webH = (field.pdfHeight / pageMeta.heightPt) * canvasHeight;

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: webX,
    top: webY,
    width: webW,
    height: webH,
    zIndex: 10,
    backgroundColor: '#ffffff',
    border: '1px solid rgba(59, 130, 246, 0.5)',
    borderRadius: '2px',
    color: '#111827',
    fontFamily: field.fontFamily === 'monospace' ? 'monospace' : 'Inter, sans-serif',
    textAlign: field.textAlign || 'left',
    fontSize: `${(field.fontSize || 12) * (canvasHeight / pageMeta.heightPt)}px`,
    fontWeight: field.fontWeight === 'bold' ? 'bold' : 'normal',
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (isDisabled) return;
    if (field.type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      updateField(field.id, { checked: target.checked });
    } else if (field.type === 'radio') {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        fields.forEach(f => {
          if (f.type === 'radio' && (f.groupName || f.name) === (field.groupName || field.name)) {
            updateField(f.id, { checked: f.id === field.id });
          }
        });
      } else {
        updateField(field.id, { checked: false });
      }
    } else {
      let val = e.target.value;
      if (field.type === 'text') {
        if (field.textSubType === 'number') {
          val = val.replace(/[^\d.,\-]/g, '');
        } else if (field.textSubType === 'currency') {
          // Allow digits, dot, comma, minus, space, and characters from the currency symbol
          // Escape special regex characters in the symbol
          const escapedSymbol = (field.currencySymbol || '€').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`[^\\d.,\\-\\s${escapedSymbol}]`, 'g');
          val = val.replace(regex, '');
        }
      } else if (field.type === 'date') {
        val = val.replace(/[^\d.\/\- ,]/g, '');
      }
      updateField(field.id, { value: val });
    }
  };


  switch (field.type) {
    case 'text':
      return <TextFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'textarea':
      return <TextareaFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'date':
      return <DateFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'dropdown':
      return <DropdownRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'checkbox':
      return <CheckboxRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'radio':
      return <RadioRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'time':
      return <TimeFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'scaleRating':
      return <ScaleRatingFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'inputTable':
      return <InputTableFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'yesNo':
      return <YesNoFieldRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} handleChange={handleChange} />;
    case 'signature':
      return <SignatureRenderer baseStyle={baseStyle} />;
    case 'scribble':
      return <ScribbleRenderer field={field} isDisabled={isDisabled} baseStyle={baseStyle} />;
    case 'barcode':
      return <BarcodeRenderer field={field} baseStyle={baseStyle} />;
    case 'button':
      return (
        <ButtonRenderer 
          field={field} 
          baseStyle={baseStyle} 
          isDisabled={isDisabled}
          onClick={() => {
            // Triggering a toast notification to simulate the button action in preview mode
            toast.info(`Vorschau: Hier würde die Aktion '${field.buttonAction === 'lock' ? 'Formular Sperren' : 'Submit Webhook'}' ausgeführt werden.`);
          }}
        />
      );
    default:
      return null;
  }
}
