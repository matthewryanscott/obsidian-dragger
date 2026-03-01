import { Editor } from 'obsidian';

function getIndentString(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
}

function getIndentSize(line: string): number {
    return getIndentString(line).length;
}

/**
 * Detect the indent unit used in the document by finding the first
 * parent→child indent difference.
 */
function detectIndentUnit(editor: Editor): string {
    const lineCount = editor.lineCount();
    for (let i = 0; i < Math.min(lineCount - 1, 200); i++) {
        const line1 = editor.getLine(i);
        const line2 = editor.getLine(i + 1);
        if (line1.trim() === '' || line2.trim() === '') continue;

        const indent1 = getIndentString(line1);
        const indent2 = getIndentString(line2);

        if (indent2.length > indent1.length && indent2.startsWith(indent1)) {
            return indent2.slice(indent1.length);
        }
    }
    return '\t';
}

/**
 * Find the end of the block starting at `startLine`. A block includes
 * the start line plus all immediately following non-empty lines with
 * deeper indent (children). Empty lines between children are included.
 */
function findBlockEnd(editor: Editor, startLine: number): number {
    const startIndent = getIndentSize(editor.getLine(startLine));
    const lineCount = editor.lineCount();
    let endLine = startLine;

    for (let i = startLine + 1; i < lineCount; i++) {
        const lineText = editor.getLine(i);
        if (lineText.trim() === '') continue;
        if (getIndentSize(lineText) > startIndent) {
            endLine = i;
        } else {
            break;
        }
    }

    return endLine;
}

/**
 * Find the previous sibling: the nearest line above `line` at the same
 * indent level. Skips empty lines and deeper-indented children.
 * Returns -1 if we hit a parent (shallower indent) or the start of the doc.
 */
function findPrevSibling(editor: Editor, line: number): number {
    const indent = getIndentSize(editor.getLine(line));

    for (let i = line - 1; i >= 0; i--) {
        const text = editor.getLine(i);
        if (text.trim() === '') continue;
        const lineIndent = getIndentSize(text);
        if (lineIndent === indent) return i;
        if (lineIndent < indent) return -1;
    }
    return -1;
}

/**
 * Find the next sibling: the nearest line after `afterLine` at the given
 * indent level. Skips empty lines and deeper-indented children.
 * Returns -1 if we hit a parent boundary or the end of the doc.
 */
function findNextSibling(editor: Editor, afterLine: number, indent: number): number {
    const lineCount = editor.lineCount();

    for (let i = afterLine + 1; i < lineCount; i++) {
        const text = editor.getLine(i);
        if (text.trim() === '') continue;
        const lineIndent = getIndentSize(text);
        if (lineIndent === indent) return i;
        if (lineIndent < indent) return -1;
    }
    return -1;
}

/**
 * Find the parent: the nearest line above `line` with strictly less indent.
 * Returns -1 if at root level.
 */
function findParent(editor: Editor, line: number): number {
    const indent = getIndentSize(editor.getLine(line));
    if (indent === 0) return -1;

    for (let i = line - 1; i >= 0; i--) {
        const text = editor.getLine(i);
        if (text.trim() === '') continue;
        const lineIndent = getIndentSize(text);
        if (lineIndent < indent) return i;
    }
    return -1;
}

function reindentLines(lines: string[], oldRootIndent: string, newRootIndent: string): string[] {
    return lines.map(line => {
        if (line.startsWith(oldRootIndent)) {
            return newRootIndent + line.slice(oldRootIndent.length);
        }
        return newRootIndent + line.trimStart();
    });
}

function readLines(editor: Editor, from: number, to: number): string[] {
    const lines: string[] = [];
    for (let i = from; i <= to; i++) {
        lines.push(editor.getLine(i));
    }
    return lines;
}

function replaceLineRange(editor: Editor, from: number, to: number, newLines: string[]): void {
    const lastLineLen = editor.getLine(to).length;
    editor.replaceRange(
        newLines.join('\n'),
        { line: from, ch: 0 },
        { line: to, ch: lastLineLen }
    );
}

/**
 * Cmd+Shift+Up: The block becomes the last child of its previous sibling.
 * Since the block is already physically positioned right after the previous
 * sibling's subtree, we only need to re-indent — no line reordering needed.
 *
 * If no previous sibling exists, the block escapes to become a sibling of
 * its parent (placed above the parent).
 */
export function moveBlockUp(editor: Editor): void {
    const cursor = editor.getCursor();
    const cursorLine = cursor.line;
    const cursorCh = cursor.ch;

    const blockEnd = findBlockEnd(editor, cursorLine);
    const blockLine = editor.getLine(cursorLine);
    const currentIndent = getIndentString(blockLine);

    const prevSib = findPrevSibling(editor, cursorLine);

    if (prevSib !== -1) {
        // Normal case: nest into previous sibling (re-indent in place)
        const indentUnit = detectIndentUnit(editor);
        const sibIndent = getIndentString(editor.getLine(prevSib));
        const newRootIndent = sibIndent + indentUnit;

        const blockLines = readLines(editor, cursorLine, blockEnd);
        const newLines = reindentLines(blockLines, currentIndent, newRootIndent);

        replaceLineRange(editor, cursorLine, blockEnd, newLines);

        const indentDelta = newRootIndent.length - currentIndent.length;
        editor.setCursor({ line: cursorLine, ch: Math.max(0, cursorCh + indentDelta) });
        return;
    }

    // Escape case: no previous sibling — move block above parent
    const parent = findParent(editor, cursorLine);
    if (parent === -1) return; // At root with no parent, nothing to do

    const parentIndent = getIndentString(editor.getLine(parent));
    const blockLines = readLines(editor, cursorLine, blockEnd);
    const reindented = reindentLines(blockLines, currentIndent, parentIndent);

    // Lines between parent and block (parent's earlier children with deeper indent)
    const midLines = readLines(editor, parent + 1, cursorLine - 1);
    const parentLineText = editor.getLine(parent);

    // New arrangement: [reindented block, parent line, mid lines]
    const newLines = [...reindented, parentLineText, ...midLines];

    replaceLineRange(editor, parent, blockEnd, newLines);

    // Cursor: block now starts at the parent's original line
    const indentDelta = parentIndent.length - currentIndent.length;
    editor.setCursor({ line: parent, ch: Math.max(0, cursorCh + indentDelta) });
}

/**
 * Cmd+Shift+Down: The block moves past its next sibling and becomes
 * the first child of that sibling. This requires reordering lines:
 * [block, gap?, nextSib] → [gap?, nextSib, reindented block]
 *
 * If no next sibling exists, the block escapes to become a sibling of
 * its parent (placed after the parent's subtree).
 */
export function moveBlockDown(editor: Editor): void {
    const cursor = editor.getCursor();
    const cursorLine = cursor.line;
    const cursorCh = cursor.ch;

    const blockEnd = findBlockEnd(editor, cursorLine);
    const blockLine = editor.getLine(cursorLine);
    const currentIndent = getIndentString(blockLine);
    const currentIndentSize = currentIndent.length;

    const nextSib = findNextSibling(editor, blockEnd, currentIndentSize);

    if (nextSib !== -1) {
        // Normal case: move past next sibling and nest into it
        const indentUnit = detectIndentUnit(editor);
        const sibIndent = getIndentString(editor.getLine(nextSib));
        const newRootIndent = sibIndent + indentUnit;

        const blockLines = readLines(editor, cursorLine, blockEnd);
        const gapAndSibLines = readLines(editor, blockEnd + 1, nextSib);
        const reindented = reindentLines(blockLines, currentIndent, newRootIndent);

        const newLines = [...gapAndSibLines, ...reindented];

        replaceLineRange(editor, cursorLine, nextSib, newLines);

        const newCursorLine = cursorLine + gapAndSibLines.length;
        const indentDelta = newRootIndent.length - currentIndent.length;
        editor.setCursor({ line: newCursorLine, ch: Math.max(0, cursorCh + indentDelta) });
        return;
    }

    // Escape case: no next sibling — move block after parent's subtree
    const parent = findParent(editor, cursorLine);
    if (parent === -1) return; // At root with no parent, nothing to do

    const parentIndent = getIndentString(editor.getLine(parent));
    const parentSubtreeEnd = findBlockEnd(editor, parent);

    const blockLines = readLines(editor, cursorLine, blockEnd);
    const reindented = reindentLines(blockLines, currentIndent, parentIndent);

    // Lines after the block but still within parent's subtree (later siblings' subtrees)
    const afterLines = readLines(editor, blockEnd + 1, parentSubtreeEnd);

    // New arrangement: [after lines, reindented block]
    const newLines = [...afterLines, ...reindented];

    replaceLineRange(editor, cursorLine, parentSubtreeEnd, newLines);

    // Cursor: block now starts after the afterLines
    const newCursorLine = cursorLine + afterLines.length;
    const indentDelta = parentIndent.length - currentIndent.length;
    editor.setCursor({ line: newCursorLine, ch: Math.max(0, cursorCh + indentDelta) });
}
