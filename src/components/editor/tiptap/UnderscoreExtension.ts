import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Node } from '@tiptap/pm/model';

export const UnderscoreAdjustExtension = Extension.create({
  name: 'underscoreAdjust',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('underscoreAdjust'),
        state: {
          init(_, { doc }) {
            return findUnderscores(doc);
          },
          apply(tr, old) {
            if (!tr.docChanged) return old.map(tr.mapping, tr.doc);
            return findUnderscores(tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function findUnderscores(doc: Node) {
  const decorations: Decoration[] = [];
  
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    
    const text = node.text || '';
    let match;
    const regex = /_+/g;
    
    while ((match = regex.exec(text)) !== null) {
      decorations.push(
        Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
          class: 'underscore-adjust',
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}
