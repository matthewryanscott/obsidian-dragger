import { describe, it, expect } from 'vitest';
import { moveBlockUp, moveBlockDown } from './block-mover';

/**
 * Creates a mock Obsidian Editor for testing block-mover operations.
 * Cursor position is indicated by | in the input string.
 */
function createMockEditor(docWithCursor: string): {
    editor: any;
    getCursorPos: () => { line: number; ch: number };
    getDoc: () => string;
    getDocWithCursor: () => string;
} {
    // Parse cursor position from |
    const lines = docWithCursor.split('\n');
    let cursorLine = 0;
    let cursorCh = 0;
    const cleanLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const idx = lines[i].indexOf('|');
        if (idx !== -1) {
            cursorLine = i;
            cursorCh = idx;
            cleanLines.push(lines[i].replace('|', ''));
        } else {
            cleanLines.push(lines[i]);
        }
    }

    let docLines = [...cleanLines];
    let cursor = { line: cursorLine, ch: cursorCh };

    const editor = {
        getLine(n: number): string {
            return docLines[n] ?? '';
        },
        lineCount(): number {
            return docLines.length;
        },
        getCursor(): { line: number; ch: number } {
            return { ...cursor };
        },
        setCursor(pos: { line: number; ch: number }): void {
            cursor = { ...pos };
        },
        replaceRange(
            text: string,
            from: { line: number; ch: number },
            to: { line: number; ch: number }
        ): void {
            const fullText = docLines.join('\n');

            let fromOffset = 0;
            for (let i = 0; i < from.line; i++) {
                fromOffset += docLines[i].length + 1;
            }
            fromOffset += from.ch;

            let toOffset = 0;
            for (let i = 0; i < to.line; i++) {
                toOffset += docLines[i].length + 1;
            }
            toOffset += to.ch;

            const newText = fullText.slice(0, fromOffset) + text + fullText.slice(toOffset);
            docLines = newText.split('\n');
        },
    };

    return {
        editor,
        getCursorPos: () => ({ ...cursor }),
        getDoc: () => docLines.join('\n'),
        getDocWithCursor: () => {
            return docLines
                .map((line, i) => {
                    if (i === cursor.line) {
                        return line.slice(0, cursor.ch) + '|' + line.slice(cursor.ch);
                    }
                    return line;
                })
                .join('\n');
        },
    };
}

describe('moveBlockUp', () => {
    it('nests block into previous sibling (Notion test 1)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '        - charlie\n' +
            '    - delta|\n' +
            '    - echo'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '        - charlie\n' +
            '        - delta|\n' +
            '    - echo'
        );
    });

    it('nests block with children into previous sibling (Notion test 3)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '    - charlie|\n' +
            '        - charlie-child\n' +
            '    - delta'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '        - charlie|\n' +
            '            - charlie-child\n' +
            '    - delta'
        );
    });

    it('escapes to parent level when no previous sibling (Notion test 5)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo|\n' +
            '    - charlie'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- bravo|\n' +
            '- alpha\n' +
            '    - charlie'
        );
    });

    it('does nothing for first line in document at root indent', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A|\n' +
            '- B'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- A|\n' +
            '- B'
        );
    });

    it('handles flat siblings at root level', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '- B|\n' +
            '- C'
        );

        moveBlockUp(editor);

        // B nests into A. No indent difference in doc → fallback to \t
        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '\t- B|\n' +
            '- C'
        );
    });

    it('preserves cursor column relative to content', () => {
        const { editor, getCursorPos } = createMockEditor(
            '    - parent\n' +
            '        - child\n' +
            '    - it|em'
        );

        moveBlockUp(editor);

        // cursor was at ch=8 ("    - it" = 8 chars), indent delta = 4, new ch = 12
        const pos = getCursorPos();
        expect(pos.ch).toBe(12);
    });

    it('works with tab indentation', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '\t- B\n' +
            '\t\t- B1\n' +
            '\t- C|\n' +
            '\t- D'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '\t- B\n' +
            '\t\t- B1\n' +
            '\t\t- C|\n' +
            '\t- D'
        );
    });

    it('escapes with children when no previous sibling', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo|\n' +
            '        - bravo-child\n' +
            '    - charlie'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- bravo|\n' +
            '    - bravo-child\n' +
            '- alpha\n' +
            '    - charlie'
        );
    });

    it('escapes preserving later siblings under parent', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- parent\n' +
            '    - first|\n' +
            '    - second\n' +
            '    - third'
        );

        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- first|\n' +
            '- parent\n' +
            '    - second\n' +
            '    - third'
        );
    });
});

describe('moveBlockDown', () => {
    it('moves block past next sibling and nests into it (Notion test 2)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '        - charlie\n' +
            '    - delta|\n' +
            '    - echo'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '        - charlie\n' +
            '    - echo\n' +
            '        - delta|'
        );
    });

    it('moves block with children and nests into next sibling (Notion test 4)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '    - charlie|\n' +
            '        - charlie-child\n' +
            '    - delta'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '    - delta\n' +
            '        - charlie|\n' +
            '            - charlie-child'
        );
    });

    it('escapes to parent level when no next sibling (Notion test 6)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '    - charlie|'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '- charlie|'
        );
    });

    it('inserts as first child when next sibling already has children', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '    - A|\n' +
            '    - B\n' +
            '        - B1\n' +
            '    - C'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '    - B\n' +
            '        - A|\n' +
            '        - B1\n' +
            '    - C'
        );
    });

    it('does nothing for last line at root level with no next sibling', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '- B|'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '- B|'
        );
    });

    it('preserves cursor column relative to content', () => {
        const { editor, getCursorPos } = createMockEditor(
            '- root\n' +
            '    - it|em\n' +
            '    - next'
        );

        moveBlockDown(editor);

        const pos = getCursorPos();
        // cursor was at ch=8, indent delta = 4 (detected from root→child), new ch = 12
        expect(pos.ch).toBe(12);
    });

    it('works with tab indentation', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '\t- B|\n' +
            '\t- C\n' +
            '\t- D'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '\t- C\n' +
            '\t\t- B|\n' +
            '\t- D'
        );
    });

    it('escapes with children when no next sibling', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- alpha\n' +
            '    - bravo\n' +
            '    - charlie|\n' +
            '        - charlie-child'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- alpha\n' +
            '    - bravo\n' +
            '- charlie|\n' +
            '    - charlie-child'
        );
    });

    it('escapes past remaining siblings under parent', () => {
        // When last sibling escapes, it goes after ALL parent's children
        const { editor, getDocWithCursor } = createMockEditor(
            '- root\n' +
            '    - parent\n' +
            '        - first\n' +
            '        - second|\n' +
            '    - uncle'
        );

        moveBlockDown(editor);

        // second has no next sibling at indent 8, parent is "parent" at indent 4
        // It escapes to parent's indent level (4), placed after parent's subtree
        expect(getDocWithCursor()).toBe(
            '- root\n' +
            '    - parent\n' +
            '        - first\n' +
            '    - second|\n' +
            '    - uncle'
        );
    });
});

describe('move up/down combined scenarios', () => {
    it('move down then escape with move up (no prev sibling after nesting)', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- bullet 1\n' +
            '    - bullet 2\n' +
            '        - bullet 3\n' +
            '    - bullet 4|\n' +
            '    - bullet 5'
        );

        moveBlockDown(editor);

        expect(getDocWithCursor()).toBe(
            '- bullet 1\n' +
            '    - bullet 2\n' +
            '        - bullet 3\n' +
            '    - bullet 5\n' +
            '        - bullet 4|'
        );

        // bullet 4 is now the only child of bullet 5 (indent 8).
        // No previous sibling → escape above parent (bullet 5)
        moveBlockUp(editor);

        expect(getDocWithCursor()).toBe(
            '- bullet 1\n' +
            '    - bullet 2\n' +
            '        - bullet 3\n' +
            '    - bullet 4|\n' +
            '    - bullet 5'
        );
    });

    it('repeated move up: nest then escape', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '    - B\n' +
            '    - C|'
        );

        // First move up: C nests into B
        moveBlockUp(editor);
        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '    - B\n' +
            '        - C|'
        );

        // Second move up: C is only child of B, no prev sibling → escape above B
        moveBlockUp(editor);
        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '    - C|\n' +
            '    - B'
        );
    });

    it('repeated move down: nest then escape', () => {
        const { editor, getDocWithCursor } = createMockEditor(
            '- A\n' +
            '    - B|\n' +
            '    - C'
        );

        // First move down: B nests into C
        moveBlockDown(editor);
        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '    - C\n' +
            '        - B|'
        );

        // Second move down: B is only child of C, no next sibling → escape to C's level
        moveBlockDown(editor);
        expect(getDocWithCursor()).toBe(
            '- A\n' +
            '    - C\n' +
            '    - B|'
        );
    });
});
