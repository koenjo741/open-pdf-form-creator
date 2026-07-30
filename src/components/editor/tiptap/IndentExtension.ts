import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineTab: {
      insertTab: () => ReturnType;
      removeTab: () => ReturnType;
    };
  }
}

export const IndentExtension = Extension.create({
  name: 'inlineTab',

  addCommands() {
    return {
      insertTab: () => ({ commands }) => {
        return commands.insertContent('\t');
      },

      removeTab: () => ({ state, dispatch }) => {
        const { selection, doc } = state;
        const { $from, empty } = selection;
        
        if (empty) {
          // If cursor is right after a tab, delete it
          const textBefore = $from.nodeBefore;
          if (textBefore && textBefore.isText && textBefore.text?.endsWith('\t')) {
            if (dispatch) {
              const tr = state.tr.delete($from.pos - 1, $from.pos);
              dispatch(tr);
            }
            return true;
          }
        }
        return false;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.insertTab(),
      'Shift-Tab': () => this.editor.commands.removeTab(),
    };
  },
});
