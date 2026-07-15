import { useState, useEffect } from 'react';
import { LeftSidebar } from './components/layout/LeftSidebar';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { DataExtractor } from './components/extract/DataExtractor';
import { ConsentModal } from './components/modals/ConsentModal';
import { BulkImportModal } from './components/modals/BulkImportModal';
import { FlattenConfirmModal } from './components/modals/FlattenConfirmModal';
import { ToastContainer } from './components/common/Toast';
import { TooltipLayer } from './components/common/TooltipLayer';
import { usePdfExport } from './hooks/usePdfExport';
import { useAutoSave } from './hooks/useAutoSave';
import { useEditorStore } from './store/useEditorStore';

export default function App() {
  const { exportPdf, exportPdfBuffer, isExporting } = usePdfExport();
  const appMode = useEditorStore((s) => s.appMode);
  const sidebarPosition = useEditorStore((s) => s.sidebarPosition);
  const theme = useEditorStore((s) => s.theme);
  const uiScale = useEditorStore((s) => s.uiScale);
  const [flattenModalOpen, setFlattenModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale * 100}%`;
  }, [uiScale]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  }, [theme]);

  useAutoSave();

  const handleExportEditable = () => void exportPdf('editable');
  const handleExportFlattened = () => setFlattenModalOpen(true);
  const handleFlattenConfirm = () => {
    setFlattenModalOpen(false);
    void exportPdf('flattened');
  };

  const handlePrint = async () => {
    // Open a blank window immediately to bypass popup blocker
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<div style="font-family: sans-serif; padding: 20px;">PDF wird für den Druck vorbereitet...</div>');
    }

    const rawBytes = await exportPdfBuffer('flattened');
    if (!rawBytes) {
      if (printWindow) printWindow.close();
      return;
    }
    
    const blob = new Blob([rawBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    if (printWindow) {
      printWindow.location.href = url;
    } else {
      // Fallback if popup blocker still caught it
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.click();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-50 overflow-hidden transition-colors duration-200">

      {/* Main editor area */}
      <main className={`flex-1 flex overflow-hidden min-h-0 ${sidebarPosition === 'left' ? 'flex-row-reverse' : ''}`}>
        <LeftSidebar 
          onExportEditable={handleExportEditable}
          onExportFlattened={handleExportFlattened}
          onPrint={handlePrint}
          isExporting={isExporting}
        />
        {appMode === 'extract' ? (
          <DataExtractor />
        ) : (
          <>
            <EditorCanvas />
            {appMode === 'edit' && <Sidebar />}
          </>
        )}
      </main>

      <Footer />

      {/* Modals */}
      <ConsentModal />
      <BulkImportModal />
      <FlattenConfirmModal
        open={flattenModalOpen}
        onConfirm={handleFlattenConfirm}
        onCancel={() => setFlattenModalOpen(false)}
      />

      {/* Toast notifications */}
      <ToastContainer />
      <TooltipLayer />
    </div>
  );
}
