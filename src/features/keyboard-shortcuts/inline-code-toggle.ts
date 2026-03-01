import { Editor } from 'obsidian';

export function toggleInlineCode(editor: Editor): void {
    const selection = editor.getSelection();

    if (selection.startsWith('`') && selection.endsWith('`') && selection.length >= 2) {
        editor.replaceSelection(selection.slice(1, -1));
    } else {
        editor.replaceSelection('`' + selection + '`');
    }
}
