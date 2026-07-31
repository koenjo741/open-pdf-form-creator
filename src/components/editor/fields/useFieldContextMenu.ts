import { useState, useEffect } from 'react';
import type { FieldDef } from '../../../types';
import { useEditorStore } from '../../../store/useEditorStore';
import { toast } from '../../common/Toast';

export function useFieldContextMenu(
  fields: FieldDef[],
  pageFields: FieldDef[],
  addField: (field: FieldDef) => void,
  selectField: (id: string) => void,
  updateField: (id: string, patch: Partial<FieldDef>) => void
) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fieldId: string } | null>(null);
  const [promptModal, setPromptModal] = useState<{ open: boolean; fieldId: string; initialValue: string } | null>(null);

  // Click outside to close context menu
  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRename = () => {
    if (!contextMenu) return;
    const currentField = pageFields.find(f => f.id === contextMenu.fieldId);
    if (currentField) {
      setPromptModal({ open: true, fieldId: contextMenu.fieldId, initialValue: currentField.name });
      setContextMenu(null);
    }
  };

  const handleClone = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    const sourceLabel = sourceField.label || sourceField.name || '';
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const pageMetas = useEditorStore.getState().pageMetas;
    const pageMeta = pageMetas.find(m => m.pageIndex === sourceField.pageIndex);
    const pageHeight = pageMeta ? pageMeta.heightPt : 841.89; // Default A4 height

    let newPdfX = Number(sourceField.pdfX);
    let newPdfY = Number(sourceField.pdfY) - Number(sourceField.pdfHeight || 24) - 10;

    // Wrap around if it falls off the bottom of the page
    if (newPdfY < 0) {
      newPdfY = pageHeight - Number(sourceField.pdfHeight || 24) - 10;
      newPdfX += 20;
    }

    const newField: FieldDef = {
      ...sourceField,
      id,
      // Name stays exactly the same so it acts as a mirror/clone
      label: sourceLabel.includes(' (nicht editierbar)') 
        ? sourceLabel 
        : `${sourceLabel} (nicht editierbar)`,
      pdfX: newPdfX,
      pdfY: newPdfY,
    };
    addField(newField);
    selectField(id);
    setContextMenu(null);
  };

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    const sourceLabel = sourceField.label || sourceField.name || '';
    if (sourceLabel.includes(' (nicht editierbar)')) {
      return handleClone();
    }

    let prefix = sourceField.name.split(' -- ')[0] || sourceField.type;
    // ensure prefix is capitalized if it was e.g. text
    prefix = prefix.charAt(0).toUpperCase() + prefix.slice(1);

    let counter = 1;
    let baseName = '';
    while (true) {
      baseName = `${prefix} -- ${counter}`;
      if (!fields.some(f => f.name === baseName)) break;
      counter++;
    }

    const pageMetas = useEditorStore.getState().pageMetas;
    const pageMeta = pageMetas.find(m => m.pageIndex === sourceField.pageIndex);
    const pageHeight = pageMeta ? pageMeta.heightPt : 841.89;

    let newPdfX = Number(sourceField.pdfX);
    let newPdfY = Number(sourceField.pdfY) - Number(sourceField.pdfHeight || 24) - 10;

    if (newPdfY < 0) {
      newPdfY = pageHeight - Number(sourceField.pdfHeight || 24) - 10;
      newPdfX += 20;
    }

    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10);
    const newField: FieldDef = {
      ...sourceField,
      id,
      name: baseName,
      label: baseName,
      pdfX: newPdfX,
      pdfY: newPdfY,
    };
    
    if (newField.type === 'radio') {
      // Set a new unique Exportwert visible to the user instead of leaving it empty
      newField.radioValue = newField.id.slice(0, 8);
    }
    
    addField(newField);
    selectField(id);
    setContextMenu(null);
  };

  const handleConvert = (newType: FieldDef['type'], newSubType?: string) => {
    if (!contextMenu) return;
    const currentField = fields.find(f => f.id === contextMenu.fieldId);
    if (!currentField) return;

    const patch: Partial<FieldDef> = { type: newType };
    
    // reset some common text/options fields
    patch.textSubType = undefined;
    patch.options = undefined;
    patch.checkedByDefault = undefined;
    patch.groupName = undefined;
    patch.radioValue = undefined;
    patch.buttonAction = undefined;

    if (newType === 'text') {
      patch.textSubType = newSubType as FieldDef['textSubType'] || 'text';
    } else if (newType === 'dropdown') {
      patch.options = [];
    } else if (newType === 'checkbox') {
      patch.checkedByDefault = false;
    } else if (newType === 'radio') {
      patch.groupName = 'group1';
      patch.radioValue = currentField.id.slice(0, 4);
    } else if (newType === 'button') {
      patch.buttonAction = (newSubType as 'submit' | 'lock') || 'submit';
    } else if (newType === 'barcode') {
      patch.barcodeFormat = 'qrcode';
    } else if (newType === 'time') {
      patch.timeFormat = '24h';
    } else if (newType === 'scaleRating') {
      patch.scaleMin = 1;
      patch.scaleMax = 5;
      patch.scaleMinLabel = 'Worst';
      patch.scaleMaxLabel = 'Best';
    } else if (newType === 'inputTable') {
      patch.tableRows = ['Row 1', 'Row 2'];
      patch.tableCols = ['Col 1', 'Col 2'];
      patch.tableInputType = 'textbox';
    } else if (newType === 'yesNo') {
      patch.yesLabel = 'JA';
      patch.noLabel = 'NEIN';
    }

    updateField(currentField.id, patch);
    setContextMenu(null);
  };

  return {
    contextMenu,
    setContextMenu,
    promptModal,
    setPromptModal,
    handleRename,
    handleDuplicate,
    handleClone,
    handleConvert
  };
}
