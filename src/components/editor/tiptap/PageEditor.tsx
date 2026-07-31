import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import { LineHeight } from './LineHeightExtension';
import { FontSize } from './FontSizeExtension';
import { useEditorStore } from '../../../store/useEditorStore';
import type { PageMeta } from '../../../types';
import { 
  Bold, Italic, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Type, Indent, Outdent
} from 'lucide-react';
import { IndentExtension } from './IndentExtension';
import { UnderscoreAdjustExtension } from './UnderscoreExtension';

interface PageEditorProps {
  pageMeta: PageMeta;
  isActive: boolean; // Not strictly needed for rendering, but good to know
  scale: number;
}

const MenuBar = ({ editor }: { editor: any }) => {
  const [savedSelection, setSavedSelection] = useState<any>(null);

  if (!editor) {
    return null;
  }

  const handleSelectFocus = () => {
    const { from, to } = editor.state.selection;
    setSavedSelection({ from, to });
  };

  const applySelectChange = (action: (chain: any, val: string) => any, value: string) => {
    let chain = editor.chain();
    if (savedSelection) {
      chain = chain.setTextSelection(savedSelection);
    }
    // Apply the action and then focus to ensure the editor re-renders with focus
    action(chain, value).focus().run();
    setSavedSelection(null);
  };

  return (
    <div className="absolute bottom-full mb-1 left-0 w-full flex flex-wrap items-center gap-1 p-1 bg-white/95 dark:bg-gray-800/95 border border-gray-200 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-200 pointer-events-auto z-50 shadow-sm backdrop-blur-sm">
      
      {/* Font Family */}
      <select 
        className="text-[10px] uppercase font-semibold bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 mx-0.5 focus:outline-none"
        onFocus={handleSelectFocus}
        onChange={(e) => applySelectChange((chain, val) => chain.setFontFamily(val), e.target.value)}
        value={editor.getAttributes('textStyle').fontFamily || 'Helvetica'}
        title="Font Family"
      >
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="Helvetica">Helvetica</option>
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="Times">Times</option>
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="Courier">Courier</option>
      </select>

      {/* Font Size */}
      <select
        className="text-[10px] bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 mx-0.5 focus:outline-none"
        onFocus={handleSelectFocus}
        onChange={(e) => applySelectChange((chain, val) => chain.setFontSize(val), e.target.value)}
        title="Font Size"
        value={editor.getAttributes('textStyle').fontSize || '12px'}
      >
        {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 30, 36].map(size => (
          <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" key={size} value={`${size}px`}>{size}</option>
        ))}
      </select>

      {/* Text Color */}
      <input
        type="color"
        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        className="w-5 h-5 p-0 border-0 rounded cursor-pointer mx-0.5 bg-transparent"
        title="Text Color"
        value={editor.getAttributes('textStyle').color || '#000000'}
      />

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('bold') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
        title="Bold"
      >
        <Bold size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('italic') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
        title="Italic"
      >
        <Italic size={14} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

      <button
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <AlignLeft size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <AlignCenter size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <AlignRight size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <AlignJustify size={14} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

      <button
        onClick={() => editor.chain().focus().removeTab().run()}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Outdent (Shift+Tab)"
      >
        <Outdent size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().insertTab().run()}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
        title="Indent (Tab)"
      >
        <Indent size={14} />
      </button>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
      
      {/* Line Height */}
      <select 
        className="text-[10px] uppercase font-semibold bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 mx-0.5 focus:outline-none"
        onFocus={handleSelectFocus}
        onChange={(e) => applySelectChange((chain, val) => chain.setLineHeight(val), e.target.value)}
        title="Line Spacing"
        value={editor.getAttributes('paragraph').lineHeight || '1.5'}
      >
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="1">1.0 Spacing</option>
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="1.5">1.5 Spacing</option>
        <option className="text-gray-900 bg-white dark:bg-gray-800 dark:text-gray-200" value="2">2.0 Spacing</option>
      </select>

      <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('bulletList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <List size={14} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 ${editor.isActive('orderedList') ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400' : ''}`}
      >
        <ListOrdered size={14} />
      </button>

    </div>
  );
};

export const PageEditor: React.FC<PageEditorProps> = ({ pageMeta, isActive, scale }) => {
  const { backgroundLayers, updateBackgroundLayer, activeTool } = useEditorStore();
  const initialContent = (backgroundLayers && backgroundLayers[pageMeta.pageIndex]) || { type: 'doc', content: [{ type: 'paragraph' }] };

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      LineHeight,
      FontSize,
      IndentExtension,
      UnderscoreAdjustExtension,
    ],
    content: initialContent,
    onUpdate: ({ editor }) => {
      updateBackgroundLayer(pageMeta.pageIndex, editor.getJSON());
    },
    editorProps: {
      attributes: {
        // Enforce base styling matching pdf-lib defaults for our background.
        // We remove 'prose' and use strict [&_p]:m-0 to ensure line-heights in HTML
        // perfectly match the raw PDF rendering loop in renderTiptapLayerToPDF.
        // renderTiptapLayer adds 6px after paragraphs/lists, and 12px after headings.
        class: 'text-black max-w-none focus:outline-none h-full [&_p]:m-0 [&_p]:mb-[6px] [&_h1]:m-0 [&_h1]:mb-[12px] [&_h1]:text-[18px] [&_h1]:font-bold [&_h2]:m-0 [&_h2]:mb-[12px] [&_h2]:text-[18px] [&_h2]:font-bold [&_h3]:m-0 [&_h3]:mb-[12px] [&_h3]:text-[18px] [&_h3]:font-bold [&_ul]:m-0 [&_ul]:mb-[6px] [&_li]:m-0',
        style: `font-size: 12px; color: black; font-family: Helvetica, Arial, sans-serif; line-height: 1.5; padding: 20px; white-space: pre-wrap; tab-size: 10px;`,
      },
    },
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {editor && (
        <MenuBar editor={editor} />
      )}
      
      {/* The actual editor content, scaled. pointer-events-none during select mode so marquee works */}
      <div 
        className={`absolute top-0 left-0 origin-top-left ${activeTool === 'select' ? 'pointer-events-none' : 'pointer-events-auto select-text cursor-text'}`}
        onClick={() => editor?.commands.focus()}
        style={{
          width: `${pageMeta.widthPt}px`,
          height: `${pageMeta.heightPt}px`,
          transform: `scale(${scale})`,
        }}
      >
        <EditorContent editor={editor} className="absolute inset-0 [&>div]:h-full [&>div]:outline-none" />
      </div>
    </div>
  );
};
