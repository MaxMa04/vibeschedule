import { Extension } from '@tiptap/react';

// bold and underline are exclusive, the backend turns each into its own
// unicode letters
export const InterceptBoldShortcut = Extension.create({
  name: 'preventBoldWithUnderline',
  addKeyboardShortcuts() {
    return {
      'Mod-b': () => this.editor.chain().unsetUnderline().toggleBold().run(),
    };
  },
});

export const InterceptUnderlineShortcut = Extension.create({
  name: 'preventUnderlineWithBold',
  addKeyboardShortcuts() {
    return {
      'Mod-u': () => this.editor.chain().unsetBold().toggleUnderline().run(),
    };
  },
});
