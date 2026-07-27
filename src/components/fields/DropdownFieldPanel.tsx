import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditorStore } from '../../store/useEditorStore';
import { FieldCommonInputs } from './FieldCommonInputs';
import { FieldTextStyling } from './FieldTextStyling';
import { Plus, X, GripVertical, ChevronDown } from 'lucide-react';
import type { FieldDef } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SALUTATION_PRESET = ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.'];
const TITLE_PRESET = ['B.Sc.', 'M.Sc.', 'MBA', 'M.D.', 'Ph.D.', 'Prof.'];

interface Props { field: FieldDef; }

function SortableOption({ id, label, onRemove }: { id: string; label: string; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800/60 border border-zinc-700/40 group ${
        isDragging ? 'opacity-50 z-50 shadow-lg' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-zinc-500 hover:text-zinc-300 shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>
      <span className="flex-1 text-xs text-zinc-300 truncate">{label}</span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 transition-all"
        aria-label={`Remove ${label}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function DropdownFieldPanel({ field }: Props) {
  const { t } = useTranslation();
  const { updateField } = useEditorStore();
  const [newOption, setNewOption] = useState('');
  const [presetsOpen, setPresetsOpen] = useState(false);

  const options = field.options ?? [];

  // Stable IDs: use index-prefixed keys to handle duplicate option labels
  const optionIds = options.map((opt, i) => `${i}::${opt}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = optionIds.indexOf(active.id as string);
    const newIndex = optionIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    updateField(field.id, { options: arrayMove(options, oldIndex, newIndex) });
  };

  const addOption = () => {
    const trimmed = newOption.trim();
    if (!trimmed || options.includes(trimmed)) return;
    updateField(field.id, { options: [...options, trimmed] });
    setNewOption('');
  };

  const removeOption = (index: number) => {
    updateField(field.id, { options: options.filter((_, i) => i !== index) });
  };

  const applyPreset = (preset: string[]) => {
    updateField(field.id, { options: preset });
    setPresetsOpen(false);
  };

  return (
    <div className="space-y-4">
      <FieldCommonInputs field={field} />
      <FieldTextStyling field={field} />

      {/* Options */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-zinc-300">{t('sidebar.options')}</label>

          {/* Presets button */}
          <div className="relative">
            <button
              id={`dropdown-presets-btn-${field.id}`}
              onClick={() => setPresetsOpen((o) => !o)}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              {t('sidebar.presets')} <ChevronDown className="w-3 h-3" />
            </button>
            <AnimatePresence>
              {presetsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-40 bg-zinc-900 border border-zinc-700/60 rounded-xl shadow-xl z-10 overflow-hidden"
                  onMouseLeave={() => setPresetsOpen(false)}
                >
                  <button
                    onClick={() => applyPreset(SALUTATION_PRESET)}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {t('sidebar.salutations')}
                  </button>
                  <button
                    onClick={() => applyPreset(TITLE_PRESET)}
                    className="w-full px-3 py-2.5 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors"
                  >
                    {t('sidebar.titles')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Option list */}
        <div className="space-y-1 mb-2 max-h-44 overflow-y-auto pr-1">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={optionIds} strategy={verticalListSortingStrategy}>
              {options.map((opt, i) => (
                <SortableOption
                  key={optionIds[i]}
                  id={optionIds[i]}
                  label={opt}
                  onRemove={() => removeOption(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
          {options.length === 0 && (
            <p className="text-zinc-500 text-xs text-center py-3">No options yet</p>
          )}
        </div>

        {/* Add option input */}
        <div className="flex gap-1.5">
          <input
            id={`dropdown-add-option-${field.id}`}
            type="text"
            value={newOption}
            onChange={(e) => setNewOption(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOption()}
            placeholder={t('sidebar.addOption')}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700/60 focus:border-blue-500/50
              text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
          />
          <button
            onClick={addOption}
            className="p-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/20 text-blue-400 transition-colors"
            aria-label="Add option"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

