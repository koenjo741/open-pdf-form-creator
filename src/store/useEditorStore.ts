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
}

export interface EditorActions {
  setAppMode: (mode: AppMode) => void;
  setPdfBuffer: (buffer: Uint8Array, fileName: string, initialFields?: FieldDef[]) => void;
  clearPdf: () => void;
  setPageMetas: (metas: PageMeta[]) => void;
  addField: (field: FieldDef) => void;
  updateField: (id: string, patch: Partial<FieldDef>) => void;
  deleteField: (id?: string) => void;
  selectField: (id: string | null, multi?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;
  setActiveTool: (tool: ToolMode) => void;
  /** Check uniqueness of a field name (excluding the field being edited) */
  isNameTaken: (name: string, excludeId?: string) => boolean;
}

type EditorStore = EditorState & EditorActions;

// ─── Persisted slice (fields + page metas + tool) ────────────────────────────
// pdfBuffer is intentionally NOT in the persisted state.

type PersistedState = Pick<EditorState, 'fields' | 'pageMetas' | 'activeTool'>;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useEditorStore = create<EditorStore>()(
  persist(
    temporal(
      (set, get) => ({
        // ── Initial state ──────────────────────────────────────────────────
        pdfBuffer: null,
        pdfFileName: null,
        fields: [],
        selectedFieldIds: [],
        pageMetas: [],
        activeTool: 'select' as ToolMode,
        isLoaded: false,
        appMode: 'edit',

        // ── Actions ───────────────────────────────────────────────────────
        setAppMode: (mode) => set({ appMode: mode }),
        
        setPdfBuffer: (buffer, fileName, initialFields) =>
          set((state) => ({ 
            pdfBuffer: buffer, 
            pdfFileName: fileName, 
            isLoaded: true,
            fields: initialFields ? initialFields : state.fields
          })),

        clearPdf: () =>
          set({
            pdfBuffer: null,
            pdfFileName: null,
            fields: [],
            selectedFieldIds: [],
            pageMetas: [],
            isLoaded: false,
          }),

        setPageMetas: (metas) => set({ pageMetas: metas }),

        addField: (field) =>
          set((state) => ({ fields: [...state.fields, field] })),

        updateField: (id, patch) =>
          set((state) => ({
            fields: state.fields.map((f) =>
              f.id === id ? { ...f, ...patch } : f,
            ),
          })),

        deleteField: (id) =>
          set((state) => {
            if (id) {
              return {
                fields: state.fields.filter((f) => f.id !== id),
                selectedFieldIds: state.selectedFieldIds.filter((selId) => selId !== id),
              };
            }
            // Delete all selected
            return {
              fields: state.fields.filter((f) => !state.selectedFieldIds.includes(f.id)),
              selectedFieldIds: [],
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

        isNameTaken: (name, excludeId) => {
          const { fields } = get();
          return fields.some(
            (f) =>
              f.name.toLowerCase() === name.toLowerCase() &&
              f.id !== excludeId,
          );
        },
      }),
      {
        // zundo options — undo/redo is in-memory only (not persisted)
        partialize: (state): PersistedState => ({
          fields: state.fields,
          pageMetas: state.pageMetas,
          activeTool: state.activeTool,
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

