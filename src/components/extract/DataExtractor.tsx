import { useState, useRef, useEffect } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Download, UploadCloud, FileJson, AlertCircle, X } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { generateFilename } from '../../utils/dynamicFilename';
import { saveFileWithPicker } from '../../utils/fileSystem';
import { useTranslation, Trans } from 'react-i18next';
import { toast } from '../common/Toast';
import { formatTableValues } from '../../utils/tableExportUtils';

export function DataExtractor() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<Record<string, any> | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { filenameTemplate, setAppMode, isLoaded, fields, pdfFileName } = useEditorStore();
  const { t } = useTranslation();

  // Auto-fill extracted data if a document is currently loaded in the editor
  useEffect(() => {
    if (isLoaded && fields && fields.length > 0 && !extractedData) {
      const data: Record<string, any> = {};
      for (const field of fields) {
        if (field.type === 'checkbox') {
          data[field.name] = field.checked || false;
        } else if (field.type === 'radio') {
          if (field.checked) {
            data[field.groupName || field.name] = field.radioValue || true;
          } else if (data[field.groupName || field.name] === undefined) {
            data[field.groupName || field.name] = false;
          }
        } else if (field.type === 'dropdown') {
          data[field.name] = field.value || field.defaultOption || '';
        } else if (field.type === 'inputTable') {
          data[field.name] = formatTableValues(field);
        } else if (field.type === 'barcode' || field.type === 'signature' || field.type === 'scribble') {
          // These don't have text values to extract
          continue;
        } else {
          data[field.name] = field.value || '';
        }
      }
      setExtractedData(data);
      if (pdfFileName) {
        setOriginalFilename(pdfFileName);
      }
    }
  }, [isLoaded, fields, pdfFileName, extractedData]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    await processPdfFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
      await processPdfFile(file);
    } else {
      toast.error(t('extract.toastInvalidPdf'));
    }
  };

  const processPdfFile = async (file: File) => {
    setIsExtracting(true);
    setOriginalFilename(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
      const form = pdfDoc.getForm();
      const fields = form.getFields();

      const data: Record<string, any> = {};
      for (const field of fields) {
        const name = field.getName();
        const type = field.constructor.name; // e.g. PDFTextField, PDFCheckBox

        try {
          if (type.includes('CheckBox')) {
            data[name] = form.getCheckBox(name).isChecked();
          } else if (type.includes('RadioGroup')) {
            const val = form.getRadioGroup(name).getSelected();
            data[name] = val;
          } else if (type.includes('Dropdown')) {
            const val = form.getDropdown(name).getSelected();
            data[name] = val[0] || '';
          } else {
            // Text field or other
            const val = form.getTextField(name).getText();
            data[name] = val;
          }
        } catch (e) {
          console.warn(`Could not extract field ${name}`, e);
          data[name] = null;
        }
      }

      // Post-process table fields to group them back into structured tableValues objects
      const structuredData: Record<string, any> = {};
      const tableCells: Record<string, any> = {};
      
      for (const key in data) {
        const match = key.match(/^(.*?)_R(\d+)(?:_C(\d+))?$/);
        if (match) {
          const baseName = match[1];
          const r = match[2];
          const c = match[3];
          if (!tableCells[baseName]) tableCells[baseName] = {};
          if (c !== undefined) {
            tableCells[baseName][`r${r}_c${c}`] = data[key];
          } else {
            // Handle radio buttons which output "Col0", "Col1" etc.
            const colMatch = String(data[key]).match(/^Col(\d+)$/);
            if (colMatch) {
              tableCells[baseName][`r${r}`] = parseInt(colMatch[1], 10);
            } else {
              tableCells[baseName][`r${r}`] = data[key];
            }
          }
        } else {
          structuredData[key] = data[key];
        }
      }

      // Merge grouped table data (overwrites any empty root text fields from old templates)
      const currentFields = useEditorStore.getState().fields;
      for (const baseName in tableCells) {
        const fieldDef = currentFields.find(f => f.name === baseName);
        if (fieldDef && fieldDef.type === 'inputTable') {
          structuredData[baseName] = formatTableValues(fieldDef, tableCells[baseName]);
        } else {
          structuredData[baseName] = tableCells[baseName];
        }
      }

      setExtractedData(structuredData);
      toast.success(t('extract.toastSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('extract.toastReadError'));
      setExtractedData(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveJson = async () => {
    if (!extractedData) return;

    const baseName = originalFilename.replace(/\.pdf$/i, '');
    const suggestedName = generateFilename(filenameTemplate, baseName, extractedData) + '.json';
    const jsonString = JSON.stringify(extractedData, null, 2);

    try {
      await saveFileWithPicker(jsonString, suggestedName, 'JSON Files', { 'application/json': ['.json'] });
      toast.success(t('extract.toastSaveSuccess'));
    } catch (err) {
      console.error(err);
      toast.error(t('extract.toastSaveError'));
    }
  };

  return (
    <div className="flex-1 overflow-auto flex flex-col p-8 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <FileJson className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
            {t('extract.title')}
          </h1>
          <div className="flex items-center gap-6">
            {extractedData && (
              <button
                onClick={() => setExtractedData(null)}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                {t('extract.loadNew')}
              </button>
            )}
            <button
              onClick={() => setAppMode('edit')}
              className="flex items-center gap-2 px-4 py-2 border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:border-red-500/50 transition-colors rounded-lg font-medium"
              title="Schließen"
            >
              <X className="w-5 h-5" />
              Reset / Close
            </button>
          </div>
        </div>

        {!extractedData ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-800/50 transition-colors hover:border-emerald-500 dark:hover:border-emerald-500"
          >
            <UploadCloud className="w-16 h-16 text-slate-400 dark:text-slate-500 mb-4" />
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
              {t('extract.dropHere')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t('extract.clickToUpload')}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isExtracting}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-colors"
            >
              {isExtracting ? t('extract.extracting') : t('extract.selectPdf')}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <span className="text-sm font-mono text-slate-600 dark:text-slate-400 truncate">
                  {generateFilename(filenameTemplate, originalFilename.replace(/\.pdf$/i, ''), extractedData)}.json
                </span>
                <button
                  onClick={handleSaveJson}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('extract.saveJson')}
                </button>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-[#1e1e1e] overflow-auto max-h-[60vh]">
                <pre className="text-sm font-mono text-slate-800 dark:text-[#d4d4d4]">
                  {JSON.stringify(extractedData, null, 2)}
                </pre>
              </div>
            </div>
            
            <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
              <p>
                <Trans i18nKey="extract.filenameHint">
                  Falls der Dateiname nicht wie erwartet aussieht, stelle sicher, dass du das <strong>Export Filename Template</strong> im "Edit"-Modus korrekt mit `[Feldname]` konfiguriert hast.
                </Trans>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
