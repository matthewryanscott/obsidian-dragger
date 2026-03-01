import { keymap } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { MarkdownView, Plugin } from 'obsidian';
import { indentLines, outdentLines } from './indent-outdent';
import { moveBlockUp, moveBlockDown } from './block-mover';

function getActiveEditor(plugin: Plugin) {
    return plugin.app.workspace.getActiveViewOfType(MarkdownView)?.editor ?? null;
}

export function keyboardShortcutKeymap(plugin: Plugin): Extension {
    return keymap.of([
        { key: 'Tab', run: indentLines },
        { key: 'Shift-Tab', run: outdentLines },
        {
            key: 'Mod-Shift-ArrowUp',
            run: () => {
                const editor = getActiveEditor(plugin);
                if (!editor) return false;
                moveBlockUp(editor);
                return true;
            },
        },
        {
            key: 'Mod-Shift-ArrowDown',
            run: () => {
                const editor = getActiveEditor(plugin);
                if (!editor) return false;
                moveBlockDown(editor);
                return true;
            },
        },
    ]);
}
