import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontSize } from './src/components/editor/tiptap/FontSizeExtension.ts';

const editor = new Editor({
  extensions: [StarterKit, TextStyle, Color, FontSize],
});

editor.commands.setContent({
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Hello'
        }
      ]
    }
  ]
});

editor.commands.selectAll();
editor.commands.setFontSize('24pt');

console.log(JSON.stringify(editor.getJSON(), null, 2));
