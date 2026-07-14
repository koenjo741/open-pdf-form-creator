import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Upload, X, ChevronLeft, ChevronRight, Download, Link as LinkIcon } from 'lucide-react';
import Papa from 'papaparse';
import { useEditorStore } from '../../store/useEditorStore';
import { useBulkExport } from '../../hooks/useBulkExport';
import type { FieldDef } from '../../types';

export function BulkImportModal() {
  const { bulkImportModalOpen, setBulkImportModalOpen, fields, updateFields } = useEditorStore();
  const { generateZip, isExportingBulk, exportProgress } = useBulkExport();
  
  const [data, setData] = useState<any[] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({}); // field.id -> csv column
  const [readOnlyMapping, setReadOnlyMapping] = useState<Record<string, boolean>>({}); // field.id -> boolean
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xfdf' | 'json'>('pdf');
  
  // Store original values before previewing
  const [originalValues, setOriginalValues] = useState<any[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data && results.data.length > 0) {
          setData(results.data);
          const cols = Object.keys(results.data[0] || {});
          setColumns(cols);
          
          // Auto-mapping: fuzzy match field names to columns
          const initialMapping: Record<string, string> = {};
          fields.forEach(f => {
            const exactMatch = cols.find(c => c.toLowerCase() === f.name.toLowerCase());
            if (exactMatch) initialMapping[f.id] = exactMatch;
          });
          setMapping(initialMapping);
          setStep('mapping');
        }
      },
      error: (err: any) => {
        console.error('CSV Parse Error', err);
      }
    });
  };

  const startPreview = () => {
    setOriginalValues(fields.map(f => ({ id: f.id, value: f.value, checked: f.checked })));
    setStep('preview');
    applyPreview(0);
  };

  const applyPreview = (index: number) => {
    if (!data) return;
    const row = data[index];
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
    
    updateFields(updates);
    setPreviewIndex(index);
  };

  const handleClose = () => {
    // Restore
    if (originalValues.length > 0) {
      updateFields(originalValues.map(v => ({ id: v.id, patch: { value: v.value, checked: v.checked } })));
    }
    setBulkImportModalOpen(false);
    // Reset state after animation
    setTimeout(() => {
      setData(null);
      setColumns([]);
      setMapping({});
      setReadOnlyMapping({});
      setStep('upload');
      setPreviewIndex(0);
      setOriginalValues([]);
    }, 300);
  };

  const handleExport = async () => {
    if (!data) return;
    // useBulkExport will handle restoring original values internally after export
    await generateZip(data, mapping, exportFormat, readOnlyMapping);
    handleClose();
  };

  const generateJsonPreview = () => {
    const formData: Record<string, any> = {};
    fields.forEach(f => {
      if (f.type === 'checkbox') formData[f.name] = f.checked;
      else formData[f.name] = f.value || '';
    });
    return JSON.stringify(formData, null, 2);
  };

  const generateXfdfPreview = () => {
    let xfdf = `<?xml version="1.0" encoding="UTF-8"?>\n<xfdf xmlns="http://ns.adobe.com/xfdf/" xml:space="preserve">\n<fields>\n`;
    fields.forEach(f => {
      const val = f.type === 'checkbox' ? (f.checked ? 'Yes' : 'Off') : (f.value || '');
      xfdf += `  <field name="${f.name}"><value>${val}</value></field>\n`;
    });
    xfdf += `</fields>\n</xfdf>`;
    return xfdf;
  };

  if (!bulkImportModalOpen && step === 'upload') return null;

  return createPortal(
    <AnimatePresence>
      {bulkImportModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] will-change-opacity transition-colors duration-300 ${
              step === 'preview' && exportFormat === 'pdf' ? 'bg-black/10' : 'bg-black/80'
            }`}
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none will-change-transform"
          >
            <motion.div
              drag={step === 'preview'}
              dragMomentum={false}
              className={`bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl w-full pointer-events-auto flex flex-col max-h-[85vh] ${
                step === 'preview' ? 'max-w-xl cursor-move' : 'max-w-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-zinc-800">
                <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" />
                  {step === 'upload' && 'Seriendruck: Daten importieren'}
                  {step === 'mapping' && 'Seriendruck: Felder zuordnen'}
                  {step === 'preview' && 'Seriendruck: Vorschau & Export'}
                </h3>
                <button
                  onClick={handleClose}
                  className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto">
                {step === 'upload' && (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-zinc-700 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all">
                    <Upload className="w-12 h-12 text-zinc-500 mb-4" />
                    <p className="text-zinc-300 font-medium mb-2">CSV Datei auswählen</p>
                    <p className="text-zinc-500 text-sm mb-6 text-center max-w-sm">
                      Lade eine CSV-Datei mit deinen Datensätzen hoch, um automatisch mehrere PDFs zu generieren.
                    </p>
                    <label className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium cursor-pointer transition-colors shadow-sm">
                      Datei durchsuchen
                      <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                )}

                {step === 'mapping' && (
                  <div className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                      <LinkIcon className="w-5 h-5 text-blue-400 shrink-0" />
                      <p className="text-sm text-zinc-300">
                        Wir haben {data?.length} Datensätze gefunden. Bitte ordne nun die PDF-Felder den entsprechenden CSV-Spalten zu. 
                        Nicht zugeordnete Spalten werden ignoriert.
                      </p>
                    </div>

                    <div className="border border-zinc-800 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-800/50">
                          <tr>
                            <th className="px-4 py-3 font-medium text-zinc-300 w-5/12">PDF Feld</th>
                            <th className="px-4 py-3 font-medium text-zinc-300 w-5/12">CSV Spalte</th>
                            <th className="px-4 py-3 font-medium text-zinc-300 w-2/12 text-center">Gesperrt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                          {fields.map(field => (
                            <tr key={field.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-4 py-3 text-zinc-100 font-medium">{field.name}</td>
                              <td className="px-4 py-3">
                                <select
                                  value={mapping[field.id] || ''}
                                  onChange={(e) => setMapping({ ...mapping, [field.id]: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-blue-500 text-zinc-200 outline-none"
                                >
                                  <option value="">-- Nicht zuordnen --</option>
                                  {columns.map(col => (
                                    <option key={col} value={col}>{col}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={!mapping[field.id]}
                                  checked={!!readOnlyMapping[field.id]}
                                  onChange={(e) => setReadOnlyMapping({ ...readOnlyMapping, [field.id]: e.target.checked })}
                                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-800 disabled:opacity-50"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={startPreview}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors shadow-sm"
                      >
                        Weiter zur Vorschau
                      </button>
                    </div>
                  </div>
                )}

                {step === 'preview' && data && (
                  <div className="space-y-6">
                    <p className="text-sm text-zinc-400 text-center">
                      Das PDF im Hintergrund wurde mit den Daten des aktuellen Datensatzes befüllt.
                    </p>
                    
                    <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-xl">
                      <button
                        onClick={() => applyPreview(Math.max(0, previewIndex - 1))}
                        disabled={previewIndex === 0}
                        className="p-2 text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-zinc-200 font-medium text-sm">
                        Datensatz {previewIndex + 1} von {data.length}
                      </span>
                      <button
                        onClick={() => applyPreview(Math.min(data.length - 1, previewIndex + 1))}
                        disabled={previewIndex === data.length - 1}
                        className="p-2 text-zinc-300 hover:text-white disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="pt-4 border-t border-zinc-800">
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Export Format</label>
                      <div className="flex gap-2">
                        {(['pdf', 'xfdf', 'json'] as const).map(fmt => (
                          <button
                            key={fmt}
                            onClick={() => setExportFormat(fmt)}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-all ${
                              exportFormat === fmt 
                                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' 
                                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                            }`}
                          >
                            {fmt.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {exportFormat !== 'pdf' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-inner">
                            <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                              <span className="text-xs font-mono text-zinc-400">
                                {exportFormat === 'json' ? 'data.json' : 'data.xfdf'}
                              </span>
                            </div>
                            <div className="p-4 max-h-[30vh] overflow-y-auto">
                              <pre className="text-[11px] leading-relaxed font-mono text-blue-300/80 whitespace-pre-wrap">
                                {exportFormat === 'json' ? generateJsonPreview() : generateXfdfPreview()}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleExport}
                      disabled={isExportingBulk}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold transition-colors shadow-sm mt-4 relative overflow-hidden"
                    >
                      {isExportingBulk ? (
                        <>
                          <div 
                            className="absolute left-0 top-0 bottom-0 bg-blue-400/30 transition-all duration-300"
                            style={{ width: `${exportProgress}%` }}
                          />
                          <span className="relative z-10 animate-pulse">
                            Archiv wird erstellt ({exportProgress}%)...
                          </span>
                        </>
                      ) : (
                        <>
                          <Download className="w-5 h-5" />
                          Als ZIP herunterladen ({data.length} Dateien)
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
