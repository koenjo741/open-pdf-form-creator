import { useEditorStore } from '../../store/useEditorStore';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Type, ChevronDown, Calendar, CheckSquare, Circle, Hash, Banknote, CreditCard, AtSign, Link, QrCode } from 'lucide-react';
import type { FieldDef } from '../../types';

const FIELD_ICONS: Record<string, React.ElementType> = {
  text: Type,
  dropdown: ChevronDown,
  date: Calendar,
  checkbox: CheckSquare,
  radio: Circle,
  number: Hash,
  currency: Banknote,
  iban: CreditCard,
  email: AtSign,
  url: Link,
  barcode: QrCode,
};

function SortableFieldItem({ field, isSelected, onSelect }: { field: FieldDef; isSelected: boolean; onSelect: (e: React.MouseEvent) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = FIELD_ICONS[field.type] || Type;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center gap-2 p-2 rounded-lg text-sm transition-colors cursor-pointer group ${
        isSelected
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
      } ${isDragging ? 'opacity-50 z-50 shadow-lg' : ''} border border-slate-200 dark:border-slate-800`}
      onClick={onSelect}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      
      <Icon className="w-4 h-4 shrink-0 opacity-70" />
      
      <span className="truncate flex-1 font-medium">{field.name || `Unnamed ${field.type}`}</span>
      
      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 w-4 text-center">
        {field.tabIndex}
      </span>
    </div>
  );
}

export function FieldListPanel() {
  const { fields, selectedFieldIds, selectField, reorderFields } = useEditorStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      reorderFields(active.id as string, over.id as string);
    }
  };

  const sortedFields = [...fields].sort((a, b) => (a.tabIndex || 0) - (b.tabIndex || 0));

  if (sortedFields.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Fields (Z-Order)
        </h3>
      </div>
      
      <div className="flex flex-col gap-1.5 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-300 dark:border-slate-800 max-h-64 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedFields.map(f => f.id)}
            strategy={verticalListSortingStrategy}
          >
            {sortedFields.map((field) => (
              <SortableFieldItem
                key={field.id}
                field={field}
                isSelected={selectedFieldIds.includes(field.id)}
                onSelect={(e) => selectField(field.id, e.ctrlKey || e.metaKey || e.shiftKey)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </section>
  );
}
