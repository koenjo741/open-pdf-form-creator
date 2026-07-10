import { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { AddFieldToolbar } from './components/editor/AddFieldToolbar';
import { ConsentModal } from './components/modals/ConsentModal';
import { FlattenConfirmModal } from './components/modals/FlattenConfirmModal';
import { ToastContainer } from './components/common/Toast';
import { TooltipLayer } from './components/common/TooltipLayer';
import { usePdfExport } from './hooks/usePdfExport';
import { useAutoSave } from './hooks/useAutoSave';
import { useEditorStore } from './store/useEditorStore';

export default function App() {
  const { exportPdf, isExporting } = usePdfExport();
  const appMode = useEditorStore((s) => s.appMode);
  const sidebarPosition = useEditorStore((s) => s.sidebarPosition);
  const theme = useEditorStore((s) => s.theme);
  const [flattenModalOpen, setFlattenModalOpen] = useState(false);

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

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-50 overflow-hidden transition-colors duration-200">
      <Header
        onExportEditable={handleExportEditable}
        onExportFlattened={handleExportFlattened}
        isExporting={isExporting}
      />

      {/* AddFieldToolbar placed above main so it spans full width and Sidebar starts below it */}
      {appMode === 'edit' && <AddFieldToolbar />}

      {/* Main editor area */}
      <main className={`flex-1 flex overflow-hidden min-h-0 ${sidebarPosition === 'left' ? 'flex-row-reverse' : ''}`}>
        <EditorCanvas />
        {appMode === 'edit' && <Sidebar />}
      </main>

      <Footer />

      {/* Modals */}
      <ConsentModal />
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
