import React, { useRef } from 'react';
import { useEditorStore } from '../../../../store/useEditorStore';
import type { FieldDef } from '../../../../types';

export interface RendererProps {
  field: FieldDef;
  isDisabled: boolean;
  baseStyle: React.CSSProperties;
  handleChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

export function TextareaFieldRenderer({ field, isDisabled, baseStyle, handleChange }: RendererProps) {
  const { updateField } = useEditorStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow forced line breaks via Ctrl+Enter or Alt+Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.altKey)) {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const current = field.value || '';
      const newValue = current.substring(0, start) + '\n' + current.substring(end);

      updateField(field.id, { value: newValue });

      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 1;
          textareaRef.current.selectionEnd = start + 1;
        }
      });
    }
  };

  const onLocalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleChange?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      style={{
        ...baseStyle,
        resize: 'none',
        overflowY: 'auto',
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word',
        lineHeight: 1.3,
      }}
      value={field.value || ''}
      onChange={onLocalChange}
      onKeyDown={onKeyDown}
      readOnly={isDisabled}
      tabIndex={field.tabIndex}
      className={`px-1 focus:outline-none focus:ring-1 focus:ring-blue-500 ${isDisabled ? 'bg-slate-100/50 cursor-not-allowed text-slate-400' : 'bg-white'}`}
    />
  );
}
