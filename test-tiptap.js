import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { FontSize } from './src/components/editor/tiptap/FontSizeExtension.js';
import { Color } from '@tiptap/extension-color';

const json = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          marks: [
            {
              type: 'textStyle',
              attrs: {
                fontSize: '24pt',
                color: '#ff0000'
              }
            }
          ],
          text: 'Hello World'
        }
      ]
    }
  ]
};

console.log(generateHTML(json, [StarterKit, TextStyle, Color, FontSize]));
