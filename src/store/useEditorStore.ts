import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { temporal } from 'zundo';
import { get, set, del } from 'idb-keyval';
import type { FieldDef, PageMeta, ToolMode, AppMode } from '../types';

// ─── IDB Storage Adapter ──────────────────────────────────────────────────────

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get<string>(name);
    return value ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

// ─── State Shape ──────────────────────────────────────────────────────────────

export interface EditorState {
  /** Original PDF bytes — excluded from IDB (too large; re-uploaded per session) */
  pdfBuffer: Uint8Array | null;
  /** File name of the uploaded PDF */
  pdfFileName: string | null;
  /** All AcroForm field definitions, keyed by field id */
  fields: FieldDef[];
  /** Currently selected field ids */
  selectedFieldIds: string[];
  /** Metadata for each PDF page (dimensions in pt) */
  pageMetas: PageMeta[];
  /** Active tool in the toolbar */
  activeTool: ToolMode;
  /** Whether any page is currently rendered */
  isLoaded: boolean;
  /** Current app mode */
  appMode: AppMode;
  /** Sidebar position: left or right */
  sidebarPosition: 'left' | 'right';
  /** App theme: dark or light */
  theme: 'dark' | 'light';
  /** Whether grid snapping is enabled */
  snapToGrid: boolean;
  /** Template for dynamic JSON export filename */
  filenameTemplate: string;
  /** Global UI scaling factor */
  uiScale: number;
  /** Whether the bulk import modal is open */
  /** Whether the bulk import modal is open */
  bulkImportModalOpen: boolean;
  /** The size of the originally uploaded PDF in bytes */
  pdfFileSize: number;
}

export interface EditorActions {
  setAppMode: (mode: AppMode) => void;
  setSidebarPosition: (pos: 'left' | 'right') => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setUiScale: (scale: number) => void;
  setSnapToGrid: (snap: boolean) => void;
  setFilenameTemplate: (template: string) => void;
  setBulkImportModalOpen: (open: boolean) => void;
  setPdfBuffer: (buffer: Uint8Array, fileName: string, fileSize: number, initialFields?: FieldDef[]) => void;
  clearPdf: () => void;
  setPageMetas: (metas: PageMeta[]) => void;
  addField: (field: FieldDef) => void;
  addFields: (newFields: FieldDef[]) => void;
  updateField: (id: string, patch: Partial<FieldDef>) => void;
  updateFields: (updates: { id: string; patch: Partial<FieldDef> }[]) => void;
  deleteField: (id?: string) => void;
  selectField: (id: string | null, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setActiveTool: (tool: ToolMode) => void;
  /** Check uniqueness of a field name (excluding the field being edited) */
  isNameTaken: (name: string, excludeId?: string) => boolean;
  /** Sets tabIndex and swaps if duplicate */
  setTabIndex: (fieldId: string, newIndex: number | undefined) => void;
  /** Reorders fields via drag and drop */
  reorderFields: (activeId: string, overId: string) => void;
  /** Enforces 1..N tab indices for all fields */
  normalizeTabIndices: () => void;
}

type EditorStore = EditorState & EditorActions;

// Helper to enforce 1..N sequential order
function ensureSequentialTabIndices(fields: FieldDef[]): FieldDef[] {
  const sorted = [...fields].sort((a, b) => {
    if (a.tabIndex !== undefined && b.tabIndex !== undefined) {
      return a.tabIndex - b.tabIndex;
    }
    if (a.tabIndex !== undefined) return -1;
    if (b.tabIndex !== undefined) return 1;
    
    // geometric
    const aTop = a.pdfY + a.pdfHeight;
    const bTop = b.pdfY + b.pdfHeight;
    if (Math.abs(aTop - bTop) < 5) return a.pdfX - b.pdfX;
    return bTop - aTop;
  });

  return fields.map(f => {
    const correctIndex = sorted.findIndex(s => s.id === f.id) + 1;
    if (f.tabIndex !== correctIndex) return { ...f, tabIndex: correctIndex };
    return f;
  });
}

// ─── Persisted slice (fields + page metas + tool) ────────────────────────────
// pdfBuffer is intentionally NOT in the persisted state.

type PersistedState = Pick<EditorState, 'fields' | 'pageMetas' | 'activeTool' | 'sidebarPosition' | 'theme' | 'snapToGrid' | 'filenameTemplate' | 'uiScale'>;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>()(
  persist(
    temporal(
      (set) => ({
        // ── Initial state ──────────────────────────────────────────────────
        pdfBuffer: null,
        pdfFileName: null,
        pdfFileSize: 0,
        fields: [],
        selectedFieldIds: [],
        pageMetas: [],
        activeTool: 'select' as ToolMode,
        isLoaded: false,
        appMode: 'edit',
        sidebarPosition: 'right',
        theme: 'dark',
        snapToGrid: true,
        filenameTemplate: '',
        uiScale: 1,
        bulkImportModalOpen: false,

        // ── Actions ───────────────────────────────────────────────────────
        setAppMode: (mode) => set({ appMode: mode }),
        setSidebarPosition: (pos) => set({ sidebarPosition: pos }),
        setTheme: (theme) => set({ theme }),
        setUiScale: (scale) => set({ uiScale: scale }),
        setSnapToGrid: (snap) => set({ snapToGrid: snap }),
        setFilenameTemplate: (template) => set({ filenameTemplate: template }),
        setBulkImportModalOpen: (open) => set({ bulkImportModalOpen: open }),
        
        setPdfBuffer: (buffer, fileName, fileSize, initialFields) =>
          set((state) => ({ 
            pdfBuffer: buffer, 
            pdfFileName: fileName, 
            pdfFileSize: fileSize,
            isLoaded: true,
            fields: ensureSequentialTabIndices(initialFields ? initialFields : state.fields)
          })),

        clearPdf: () =>
          set({
            pdfBuffer: null,
            pdfFileName: null,
            pdfFileSize: 0,
            fields: [],
            selectedFieldIds: [],
            pageMetas: [],
            isLoaded: false,
          }),

        setPageMetas: (metas) => set({ pageMetas: metas }),

        addField: (field) =>
          set((state) => {
            const newFields = [...state.fields, { ...field, tabIndex: state.fields.length + 1 }];
            return { fields: ensureSequentialTabIndices(newFields) };
          }),

        addFields: (newFields) =>
          set((state) => {
            const added = newFields.map((f, i) => ({ ...f, tabIndex: state.fields.length + 1 + i }));
            return { fields: ensureSequentialTabIndices([...state.fields, ...added]) };
          }),

        updateField: (id, patch) =>
          set((state) => ({
            fields: state.fields.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          })),

        updateFields: (updates) =>
          set((state) => {
            const updateMap = new Map(updates.map(u => [u.id, u.patch]));
            return {
              fields: state.fields.map((f) => {
                const patch = updateMap.get(f.id);
                return patch ? { ...f, ...patch } : f;
              }),
            };
          }),

        deleteField: (id) =>
          set((state) => {
            let nextFields = state.fields;
            let nextSelected = state.selectedFieldIds;
            if (id) {
              nextFields = state.fields.filter((f) => f.id !== id);
              nextSelected = state.selectedFieldIds.filter((selId) => selId !== id);
            } else {
              // Delete all selected
              nextFields = state.fields.filter((f) => !state.selectedFieldIds.includes(f.id));
              nextSelected = [];
            }
            return {
              fields: ensureSequentialTabIndices(nextFields),
              selectedFieldIds: nextSelected,
            };
          }),

        selectField: (id, multi = false) =>
          set((state) => {
            if (id === null) return { selectedFieldIds: [] };
            if (multi) {
              const exists = state.selectedFieldIds.includes(id);
              return {
                selectedFieldIds: exists
                  ? state.selectedFieldIds.filter((sid) => sid !== id)
                  : [...state.selectedFieldIds, id],
              };
            }
            return { selectedFieldIds: [id] };
          }),

        clearSelection: () => set({ selectedFieldIds: [] }),
        
        selectAll: () => set((state) => ({ selectedFieldIds: state.fields.map(f => f.id) })),

        setActiveTool: (tool) => set({ activeTool: tool }),

        isNameTaken: (_name, _excludeId) => {
          return false; // Allowed natively in PDF to mirror fields
        },

        normalizeTabIndices: () => set((state) => ({ fields: ensureSequentialTabIndices(state.fields) })),

        setTabIndex: (fieldId, newIndex) =>
          set((state) => {
            const currentFields = state.fields;
            const targetField = currentFields.find(f => f.id === fieldId);
            if (!targetField) return state;

            const oldIndex = targetField.tabIndex;

            // If unsetting, just remove it from this field
            if (newIndex === undefined || newIndex === null) {
              const mapped = currentFields.map((f) => 
                f.id === fieldId ? { ...f, tabIndex: undefined } : f
              );
              return { fields: ensureSequentialTabIndices(mapped) };
            }

            // Find if any field already has this newIndex
            const conflictField = currentFields.find(f => f.tabIndex === newIndex && f.id !== fieldId);

            const mapped = currentFields.map((f) => {
              if (f.id === fieldId) {
                return { ...f, tabIndex: newIndex };
              }
              if (conflictField && f.id === conflictField.id) {
                return { ...f, tabIndex: oldIndex }; // Swap!
              }
              return f;
            });
            return { fields: ensureSequentialTabIndices(mapped) };
          }),
          
        reorderFields: (activeId, overId) =>
          set((state) => {
            const oldIndex = state.fields.findIndex(f => f.id === activeId);
            const newIndex = state.fields.findIndex(f => f.id === overId);
            if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return state;

            const newFields = [...state.fields];
            const [movedItem] = newFields.splice(oldIndex, 1);
            newFields.splice(newIndex, 0, movedItem);
            
            // Reassign tab indices based on the new array order
            newFields.forEach((f, idx) => {
              f.tabIndex = idx + 1;
            });
            
            return { fields: newFields };
          }),
      }),
      {
        // zundo options — undo/redo is in-memory only (not persisted)
        partialize: (state): PersistedState => ({
          fields: state.fields,
          pageMetas: state.pageMetas,
          activeTool: state.activeTool,
          sidebarPosition: state.sidebarPosition,
          theme: state.theme,
          snapToGrid: state.snapToGrid,
          filenameTemplate: state.filenameTemplate,
          uiScale: state.uiScale,
        }),
        limit: 100,
      },
    ),
    {
      name: 'openpdfform-editor-v1',
      storage: createJSONStorage(() => idbStorage),
      // Persist only fields, pageMetas, activeTool — NOT pdfBuffer
      partialize: (state): PersistedState => ({
        fields: state.fields,
        pageMetas: state.pageMetas,
        activeTool: state.activeTool,
        sidebarPosition: state.sidebarPosition,
        theme: state.theme,
        snapToGrid: state.snapToGrid,
        filenameTemplate: state.filenameTemplate,
        uiScale: state.uiScale,
      }),
      // Re-hydrate without crashing if IDB is unavailable
      onRehydrateStorage: () => (_state, error) => {
        if (error) {
          console.warn('[OpenFormPDF] Failed to rehydrate from IDB:', error);
        }
      },
    },
  ),
);

// ─── Temporal store accessor (for undo/redo buttons) ────────────────────────
export const useTemporalStore = () => useEditorStore.temporal;

// DEBUG: Log state changes
useEditorStore.subscribe((state, prevState) => {
  if (state.pdfBuffer !== prevState.pdfBuffer) {
    console.log('[STORE DEBUG] pdfBuffer changed from', !!prevState.pdfBuffer, 'to', !!state.pdfBuffer);
    console.trace('[STORE DEBUG] Trace for pdfBuffer change:');
  }
});

