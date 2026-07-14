import { useState } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useEditorStore } from '../store/useEditorStore';
import { usePdfExport } from './usePdfExport';
import { toast } from '../components/common/Toast';
import type { FieldDef } from '../types';

export function useBulkExport() {
  const [isExportingBulk, setIsExportingBulk] = useState(false);
  const [exportProgress, setExportProgress] = useState(0); // 0 to 100
  const { fields } = useEditorStore();
  const { exportPdfBuffer } = usePdfExport();

  const generateZip = async (
    data: any[], 
    mapping: Record<string, string>, 
    format: 'pdf' | 'xfdf' | 'json',
    readOnlyMapping?: Record<string, boolean>
  ) => {
    setIsExportingBulk(true);
    setExportProgress(0);
    try {
      const zip = new JSZip();
      
      // Save original values
      const originalValues = fields.map(f => ({ id: f.id, value: f.value, checked: f.checked }));
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        
        // 1. Temporarily apply values to store
        const updates = fields.map(f => {
          const csvCol = mapping[f.id];
          if (csvCol && row[csvCol] !== undefined) {
            if (f.type === 'checkbox') {
               return { id: f.id, patch: { checked: row[csvCol] === 'true' || row[csvCol] === '1' || row[csvCol] === 'Yes' || row[csvCol] === 'Ja' } };
            }
            return { id: f.id, patch: { value: String(row[csvCol]) } };
          }
          return null;
        }).filter(Boolean) as { id: string, patch: Partial<FieldDef> }[];
        
        useEditorStore.getState().updateFields(updates);

        // 2. Generate file
        const filename = `Document_${i + 1}`;
        
        if (format === 'json') {
          const formData: Record<string, any> = {};
          for (const f of useEditorStore.getState().fields) {
             if (f.type === 'checkbox') formData[f.name] = f.checked;
             else formData[f.name] = f.value || '';
          }
          zip.file(`${filename}.json`, JSON.stringify(formData, null, 2));
        } else if (format === 'xfdf') {
          let xfdf = `<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n<fields>\n`;
          for (const f of useEditorStore.getState().fields) {
            const val = f.type === 'checkbox' ? (f.checked ? 'Yes' : 'Off') : (f.value || '');
            xfdf += `<field name="${f.name}"><value>${val}</value></field>\n`;
          }
          xfdf += `</fields>\n</xfdf>`;
          zip.file(`${filename}.xfdf`, xfdf);
        } else {
          // PDF Format
          const readOnlyFieldNames = fields
            .filter(f => readOnlyMapping?.[f.id] && mapping[f.id])
            .map(f => f.name);

          const buffer = await exportPdfBuffer('editable', readOnlyFieldNames);
          if (buffer) {
             zip.file(`${filename}.pdf`, buffer);
          }
        }
        
        setExportProgress(Math.round(((i + 1) / data.length) * 100));
      }
      
      // Restore original values
      useEditorStore.getState().updateFields(
        originalValues.map(v => ({ id: v.id, patch: { value: v.value, checked: v.checked } }))
      );
      
      // Download ZIP
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Use modern File System Access API if available
      try {
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: 'bulk_export.zip',
            types: [{
              description: 'ZIP Archive',
              accept: { 'application/zip': ['.zip'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
        } else {
          saveAs(content, 'bulk_export.zip');
        }
        toast.success('ZIP Datei wurde erfolgreich erstellt!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
           saveAs(content, 'bulk_export.zip');
           toast.success('ZIP Datei wurde erfolgreich erstellt!');
        }
      }
      
    } catch (err: any) {
      console.error(err);
      toast.error('Fehler beim Export: ' + err.message);
    } finally {
      setIsExportingBulk(false);
      setExportProgress(0);
    }
  };

  return { generateZip, isExportingBulk, exportProgress };
}
