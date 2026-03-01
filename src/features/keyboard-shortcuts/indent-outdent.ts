import { EditorView } from '@codemirror/view';
import { EditorState, TransactionSpec } from '@codemirror/state';

function getIndentUnit(state: EditorState): string {
    const tabSize = state.tabSize;
    // Obsidian uses useTab facet, but we default to tab character
    // The user's vault settings control whether tabs or spaces are used
    return '\t'.length === 1 ? '\t' : ' '.repeat(tabSize);
}

function getLineRange(state: EditorState): { from: number; to: number } {
    const sel = state.selection.main;
    const fromLine = state.doc.lineAt(sel.from);
    const toLine = state.doc.lineAt(sel.to);
    return { from: fromLine.number, to: toLine.number };
}

export function indentLines(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = getLineRange(state);
    const unit = getIndentUnit(state);

    const changes: { from: number; insert: string }[] = [];
    for (let i = from; i <= to; i++) {
        const line = state.doc.line(i);
        changes.push({ from: line.from, insert: unit });
    }

    const spec: TransactionSpec = { changes };
    view.dispatch(state.update(spec));
    return true;
}

export function outdentLines(view: EditorView): boolean {
    const { state } = view;
    const { from, to } = getLineRange(state);

    const changes: { from: number; to: number }[] = [];
    for (let i = from; i <= to; i++) {
        const line = state.doc.line(i);
        const text = line.text;

        if (text.startsWith('\t')) {
            changes.push({ from: line.from, to: line.from + 1 });
        } else {
            // Remove up to tabSize spaces
            let spacesToRemove = 0;
            const tabSize = state.tabSize;
            while (spacesToRemove < tabSize && spacesToRemove < text.length && text[spacesToRemove] === ' ') {
                spacesToRemove++;
            }
            if (spacesToRemove > 0) {
                changes.push({ from: line.from, to: line.from + spacesToRemove });
            }
        }
    }

    if (changes.length === 0) return true;

    const spec: TransactionSpec = { changes };
    view.dispatch(state.update(spec));
    return true;
}
