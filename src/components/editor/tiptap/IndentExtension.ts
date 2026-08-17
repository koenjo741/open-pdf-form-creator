import { Extension, Node, mergeAttributes } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { TAB_GRID_SIZE, getDecimalSeparatorIndex } from '../../../utils/text/tabAlignmentUtils';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineTab: {
      insertTab: () => ReturnType;
      insertRightTab: () => ReturnType;
      insertCommaTab: () => ReturnType;
      removeTab: () => ReturnType;
    };
  }
}

function checkAndShowTabHint() {
  try {
    const seen = localStorage.getItem('openformpdf_tab_hint_seen');
    if (!seen) {
      window.dispatchEvent(new CustomEvent('OPEN_TAB_HINT'));
    }
  } catch (e) {
    // Ignore localStorage errors
  }
}

export const RightTabNode = Node.create({
  name: 'rightTab',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  parseHTML() {
    return [{ tag: 'span[data-type="right-tab"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'right-tab',
        class: 'right-tab-spacer inline-block align-baseline select-none pointer-events-none',
        style: `display: inline-block; width: ${TAB_GRID_SIZE}px; height: 1em; vertical-align: baseline; user-select: none;`,
      }),
      '\u00A0',
    ];
  },
});

export const CommaTabNode = Node.create({
  name: 'commaTab',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  parseHTML() {
    return [{ tag: 'span[data-type="comma-tab"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'comma-tab',
        class: 'comma-tab-spacer inline-block align-baseline select-none pointer-events-none',
        style: `display: inline-block; width: ${TAB_GRID_SIZE}px; height: 1em; vertical-align: baseline; user-select: none;`,
      }),
      '\u00A0',
    ];
  },
});

/**
 * Iterates through all paragraphs in the document and computes the dynamic width
 * of rightTab and commaTab spacer nodes based on following text.
 */
function updateAllTabSpacersInDoc(editorView: any) {
  try {
    const { state } = editorView;
    if (!state || !state.doc) return;
    const { doc } = state;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    doc.descendants((node: any, pos: number) => {
      if (node.type.name === 'paragraph' || node.type.name === 'heading') {
        let hasSpecialTab = false;
        for (let i = 0; i < node.childCount; i++) {
          const typeName = node.child(i).type.name;
          if (typeName === 'rightTab' || typeName === 'commaTab') {
            hasSpecialTab = true;
            break;
          }
        }
        if (!hasSpecialTab) return;

        let i = 0;
        let childPos = pos + 1;

        while (i < node.childCount) {
          const child = node.child(i);
          const currentType = child.type.name;

          if (currentType === 'rightTab' || currentType === 'commaTab') {
            const groupStart = i;
            const groupStartPos = childPos;
            
            while (i < node.childCount && node.child(i).type.name === currentType) {
              childPos += node.child(i).nodeSize;
              i++;
            }
            const groupEnd = i - 1;
            const tabCount = groupEnd - groupStart + 1;

            // Gather following text up to next tab
            let followingText = '';
            let probeIdx = i;
            while (probeIdx < node.childCount) {
              const nextChild = node.child(probeIdx);
              if (nextChild.type.name === 'rightTab' || nextChild.type.name === 'commaTab') break;
              if (nextChild.isText && nextChild.text) {
                const tabIdx = nextChild.text.indexOf('\t');
                if (tabIdx !== -1) {
                  followingText += nextChild.text.substring(0, tabIdx);
                  break;
                }
                followingText += nextChild.text;
              }
              probeIdx++;
            }

            // Calculate text width to align
            let textToMeasure = followingText;
            if (currentType === 'commaTab') {
              const sepIdx = getDecimalSeparatorIndex(followingText, true);
              if (sepIdx !== -1) {
                textToMeasure = followingText.substring(0, sepIdx);
              }
            }

            let textWidth = 0;
            const parentDOM = editorView.nodeDOM(pos) || editorView.dom;
            const computed = parentDOM ? window.getComputedStyle(parentDOM) : null;
            if (ctx && computed && textToMeasure) {
              ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
              textWidth = ctx.measureText(textToMeasure).width;
            }

            const targetTotalWidth = tabCount * TAB_GRID_SIZE;
            const availableSpace = Math.max(tabCount * 4, targetTotalWidth - textWidth);
            const singleTabWidth = availableSpace / tabCount;

            // Apply computed width to all tab DOM elements in this group
            let scanPos = groupStartPos;
            for (let c = groupStart; c <= groupEnd; c++) {
              const tabDom = editorView.nodeDOM(scanPos) as HTMLElement | null;
              if (tabDom && tabDom.style) {
                tabDom.style.width = `${singleTabWidth}px`;
              }
              scanPos += node.child(c).nodeSize;
            }
          } else {
            childPos += child.nodeSize;
            i++;
          }
        }
      }
    });
  } catch (e) {
    // Gracefully handle DOM timing quirks
  }
}

export const IndentExtension = Extension.create({
  name: 'inlineTab',

  addCommands() {
    return {
      insertTab: () => ({ commands }) => {
        checkAndShowTabHint();
        return commands.insertContent('\t');
      },

      insertRightTab: () => ({ commands }) => {
        checkAndShowTabHint();
        return commands.insertContent({ type: 'rightTab' });
      },

      insertCommaTab: () => ({ commands }) => {
        checkAndShowTabHint();
        return commands.insertContent({ type: 'commaTab' });
      },

      removeTab: () => ({ state, dispatch }) => {
        const { selection } = state;
        const { $from, empty } = selection;
        
        if (empty) {
          const nodeBefore = $from.nodeBefore;
          if (nodeBefore) {
            if (nodeBefore.type.name === 'rightTab' || nodeBefore.type.name === 'commaTab') {
              if (dispatch) {
                const tr = state.tr.delete($from.pos - nodeBefore.nodeSize, $from.pos);
                dispatch(tr);
              }
              return true;
            }
            if (nodeBefore.isText && nodeBefore.text?.endsWith('\t')) {
              if (dispatch) {
                const tr = state.tr.delete($from.pos - 1, $from.pos);
                dispatch(tr);
              }
              return true;
            }
          }
        }
        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('rightTabAutoAlign'),
        view(editorView) {
          const onSeparatorChanged = () => {
            requestAnimationFrame(() => updateAllTabSpacersInDoc(editorView));
          };
          window.addEventListener('DECIMAL_SEPARATOR_CHANGED', onSeparatorChanged);

          requestAnimationFrame(() => updateAllTabSpacersInDoc(editorView));

          return {
            update(view) {
              requestAnimationFrame(() => updateAllTabSpacersInDoc(view));
            },
            destroy() {
              window.removeEventListener('DECIMAL_SEPARATOR_CHANGED', onSeparatorChanged);
            },
          };
        },
      }),
    ];
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        this.editor.commands.insertTab();
        return true;
      },
      'Shift-Tab': () => {
        this.editor.commands.insertRightTab();
        return true;
      },
      'Alt-t': () => {
        this.editor.commands.insertCommaTab();
        return true;
      },
      'Alt-T': () => {
        this.editor.commands.insertCommaTab();
        return true;
      },
      'Alt-Shift-t': () => {
        this.editor.commands.insertCommaTab();
        return true;
      },
      'Alt-Shift-T': () => {
        this.editor.commands.insertCommaTab();
        return true;
      },
    };
  },
});
