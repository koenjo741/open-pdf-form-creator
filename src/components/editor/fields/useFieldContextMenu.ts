import { useState, useEffect } from 'react';
import type { FieldDef } from '../../../types';

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

    const id = crypto.randomUUID();
    const newField: FieldDef = {
      ...sourceField,
      id,
      // Name stays exactly the same so it acts as a mirror/clone
      label: sourceField.label.includes(' (nicht editierbar)') 
        ? sourceField.label 
        : `${sourceField.label} (nicht editierbar)`,
      pdfY: sourceField.pdfY - sourceField.pdfHeight - 10,
    };
    addField(newField);
    selectField(id);
    setContextMenu(null);
  };

  const handleDuplicate = () => {
    if (!contextMenu) return;
    const sourceField = fields.find((f) => f.id === contextMenu.fieldId);
    if (!sourceField) return;

    if (sourceField.label.includes(' (nicht editierbar)')) {
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

    const id = crypto.randomUUID();
    const newField: FieldDef = {
      ...sourceField,
      id,
      name: baseName,
      label: baseName,
      pdfY: sourceField.pdfY - sourceField.pdfHeight - 10, // place 10pt below
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
    
    if (newType === 'text') {
      patch.textSubType = newSubType as FieldDef['textSubType'] || 'text';
      patch.options = undefined;
      patch.checkedByDefault = undefined;
      patch.groupName = undefined;
      patch.radioValue = undefined;
    } else if (newType === 'dropdown') {
      patch.options = [];
      patch.textSubType = undefined;
      patch.checkedByDefault = undefined;
      patch.groupName = undefined;
      patch.radioValue = undefined;
    } else if (newType === 'checkbox') {
      patch.checkedByDefault = false;
      patch.textSubType = undefined;
      patch.options = undefined;
      patch.groupName = undefined;
      patch.radioValue = undefined;
    } else if (newType === 'radio') {
      patch.groupName = 'group1';
      patch.radioValue = currentField.id.slice(0, 4);
      patch.textSubType = undefined;
      patch.options = undefined;
      patch.checkedByDefault = undefined;
    } else {
      patch.textSubType = undefined;
      patch.options = undefined;
      patch.checkedByDefault = undefined;
      patch.groupName = undefined;
      patch.radioValue = undefined;
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
