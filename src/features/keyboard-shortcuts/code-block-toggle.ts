import { Editor } from 'obsidian';

export function toggleCodeBlock(editor: Editor): void {
    const fromLine = editor.getCursor('from').line;
    const toLine = editor.getCursor('to').line;

    // Check if we're inside a code fence by looking for ``` above and below
    const { insideFence, fenceStart, fenceEnd } = findSurroundingFence(editor, fromLine, toLine);

    if (insideFence) {
        removeFence(editor, fenceStart, fenceEnd);
    } else {
        wrapWithFence(editor, fromLine, toLine);
    }
}

function findSurroundingFence(
    editor: Editor,
    fromLine: number,
    toLine: number
): { insideFence: boolean; fenceStart: number; fenceEnd: number } {
    const lineCount = editor.lineCount();

    // Search upward for opening fence
    let fenceStart = -1;
    for (let i = fromLine; i >= 0; i--) {
        const line = editor.getLine(i).trimStart();
        if (line.startsWith('```')) {
            fenceStart = i;
            break;
        }
    }

    if (fenceStart === -1) {
        return { insideFence: false, fenceStart: -1, fenceEnd: -1 };
    }

    // The opening fence must actually be an opener (first fence line above)
    // Search downward from after the opening fence for closing fence
    let fenceEnd = -1;
    for (let i = fenceStart + 1; i < lineCount; i++) {
        const line = editor.getLine(i).trimStart();
        if (line.startsWith('```')) {
            fenceEnd = i;
            break;
        }
    }

    if (fenceEnd === -1) {
        return { insideFence: false, fenceStart: -1, fenceEnd: -1 };
    }

    // Check that our selection is fully within the fenced range
    if (fromLine > fenceStart && toLine < fenceEnd) {
        return { insideFence: true, fenceStart, fenceEnd };
    }

    // Selection includes the fence lines themselves — treat as not inside
    return { insideFence: false, fenceStart: -1, fenceEnd: -1 };
}

function removeFence(editor: Editor, fenceStart: number, fenceEnd: number): void {
    // Remove closing fence first (higher line number) to preserve line numbers
    const endLineLen = editor.getLine(fenceEnd).length;
    // Remove the closing fence line (and the newline before it)
    if (fenceEnd + 1 < editor.lineCount()) {
        editor.replaceRange('', { line: fenceEnd, ch: 0 }, { line: fenceEnd + 1, ch: 0 });
    } else {
        // Last line in document
        const prevLineLen = editor.getLine(fenceEnd - 1).length;
        editor.replaceRange('', { line: fenceEnd - 1, ch: prevLineLen }, { line: fenceEnd, ch: endLineLen });
    }

    // Remove opening fence line
    if (fenceStart + 1 < editor.lineCount()) {
        editor.replaceRange('', { line: fenceStart, ch: 0 }, { line: fenceStart + 1, ch: 0 });
    } else {
        editor.replaceRange('', { line: fenceStart, ch: 0 }, { line: fenceStart, ch: editor.getLine(fenceStart).length });
    }
}

function wrapWithFence(editor: Editor, fromLine: number, toLine: number): void {
    // Insert closing fence after the last selected line
    const lastLineLen = editor.getLine(toLine).length;
    editor.replaceRange('\n```', { line: toLine, ch: lastLineLen });

    // Insert opening fence before the first selected line
    editor.replaceRange('```\n', { line: fromLine, ch: 0 });
}
