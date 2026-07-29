import { Extension } from '@tiptap/core';
import '@tiptap/extension-text-style';

export interface LineHeightOptions {
  types: string[];
  defaultLineHeight: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height attribute
       */
      setLineHeight: (lineHeight: string) => ReturnType;
      /**
       * Unset the line height attribute
       */
      unsetLineHeight: () => ReturnType;
    };
  }
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'list_item'],
      defaultLineHeight: '1.5',
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: element => element.style.lineHeight || this.options.defaultLineHeight,
            renderHTML: attributes => {
              if (!attributes.lineHeight) {
                return {};
              }
              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight: (lineHeight: string) => ({ commands }) => {
        return this.options.types.every(type => commands.updateAttributes(type, { lineHeight }));
      },

      unsetLineHeight: () => ({ commands }) => {
        return this.options.types.every(type => commands.resetAttributes(type, 'lineHeight'));
      },
    };
  },
});
