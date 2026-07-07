import { useState } from 'react';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { Sidebar } from './components/layout/Sidebar';
import { EditorCanvas } from './components/editor/EditorCanvas';
import { ConsentModal } from './components/modals/ConsentModal';
import { FlattenConfirmModal } from './components/modals/FlattenConfirmModal';
import { ToastContainer } from './components/common/Toast';
import { usePdfExport } from './hooks/usePdfExport';
import { useAutoSave } from './hooks/useAutoSave';
import { useEditorStore } from './store/useEditorStore';

export default function App() {
  const { exportPdf, isExporting } = usePdfExport();
  const appMode = useEditorStore((s) => s.appMode);
  const [flattenModalOpen, setFlattenModalOpen] = useState(false);

  useAutoSave();

  const handleExportEditable = () => void exportPdf('editable');
  const handleExportFlattened = () => setFlattenModalOpen(true);
  const handleFlattenConfirm = () => {
    setFlattenModalOpen(false);
    void exportPdf('flattened');
  };

  return (
    <div className="h-screen flex flex-col bg-[#020617] text-zinc-100 overflow-hidden">
      <Header
        onExportEditable={handleExportEditable}
        onExportFlattened={handleExportFlattened}
        isExporting={isExporting}
      />

      {/* Main editor area */}
      <main className="flex-1 flex overflow-hidden min-h-0">
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
    </div>
  );
}
