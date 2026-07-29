const { generateHTML } = require('@tiptap/react');
const StarterKit = require('@tiptap/starter-kit').default;
const TextStyle = require('@tiptap/extension-text-style').TextStyle;
const { Color } = require('@tiptap/extension-color');
const { Extension } = require('@tiptap/core');

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return { types: ['textStyle'] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
          },
        },
      },
    ];
  },
});

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
