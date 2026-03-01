import { Plugin } from 'obsidian';
import { convertBlockType, BlockType } from './block-type-converter';
import { toggleInlineCode } from './inline-code-toggle';
import { toggleCodeBlock } from './code-block-toggle';
import { moveBlockUp, moveBlockDown } from './block-mover';

type ShortcutAction = BlockType | 'inline-code' | 'code-block' | 'move-up' | 'move-down';

interface ShortcutDef {
    id: string;
    name: string;
    hotkeys: { modifiers: string[]; key: string }[];
    action: ShortcutAction;
}

const SHORTCUTS: ShortcutDef[] = [
    { id: 'toggle-inline-code', name: 'Toggle inline code', hotkeys: [{ modifiers: ['Mod'], key: 'e' }], action: 'inline-code' },
    { id: 'convert-to-paragraph', name: 'Convert to paragraph', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '0' }], action: 'paragraph' },
    { id: 'convert-to-h1', name: 'Convert to H1', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '1' }], action: 'h1' },
    { id: 'convert-to-h2', name: 'Convert to H2', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '2' }], action: 'h2' },
    { id: 'convert-to-h3', name: 'Convert to H3', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '3' }], action: 'h3' },
    { id: 'convert-to-todo', name: 'Convert to todo', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '4' }], action: 'todo' },
    { id: 'convert-to-bullet', name: 'Convert to bullet list', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '5' }], action: 'bullet' },
    { id: 'convert-to-numbered', name: 'Convert to numbered list', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '6' }], action: 'numbered' },
    { id: 'convert-to-code-block', name: 'Toggle code block', hotkeys: [{ modifiers: ['Mod', 'Alt'], key: '8' }], action: 'code-block' },
    // move-block-up/down hotkeys are handled via CodeMirror keymap in register-keymaps.ts
    // (CodeMirror intercepts Mod-Shift-Arrow before Obsidian's command system)
    { id: 'move-block-up', name: 'Move block up', hotkeys: [], action: 'move-up' },
    { id: 'move-block-down', name: 'Move block down', hotkeys: [], action: 'move-down' },
];

export function registerKeyboardCommands(plugin: Plugin): void {
    for (const shortcut of SHORTCUTS) {
        plugin.addCommand({
            id: shortcut.id,
            name: shortcut.name,
            hotkeys: shortcut.hotkeys as any,
            editorCallback: (editor) => {
                switch (shortcut.action) {
                    case 'inline-code':
                        toggleInlineCode(editor);
                        break;
                    case 'code-block':
                        toggleCodeBlock(editor);
                        break;
                    case 'move-up':
                        moveBlockUp(editor);
                        break;
                    case 'move-down':
                        moveBlockDown(editor);
                        break;
                    default:
                        convertBlockType(editor, shortcut.action);
                }
            },
        });
    }
}
