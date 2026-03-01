import { describe, it, expect } from 'vitest';
import { parseLineParts, convertLine, convertLines, BlockType } from './block-type-converter';

describe('parseLineParts', () => {
    it('parses plain text', () => {
        expect(parseLineParts('hello world')).toEqual({
            indent: '', prefix: '', content: 'hello world',
        });
    });

    it('parses indented plain text', () => {
        expect(parseLineParts('    hello')).toEqual({
            indent: '    ', prefix: '', content: 'hello',
        });
    });

    it('parses heading', () => {
        expect(parseLineParts('## My heading')).toEqual({
            indent: '', prefix: '## ', content: 'My heading',
        });
    });

    it('parses indented heading', () => {
        expect(parseLineParts('  # Title')).toEqual({
            indent: '  ', prefix: '# ', content: 'Title',
        });
    });

    it('parses bullet list', () => {
        expect(parseLineParts('- item')).toEqual({
            indent: '', prefix: '- ', content: 'item',
        });
    });

    it('parses bullet with * marker', () => {
        expect(parseLineParts('* item')).toEqual({
            indent: '', prefix: '* ', content: 'item',
        });
    });

    it('parses indented bullet', () => {
        expect(parseLineParts('    - nested')).toEqual({
            indent: '    ', prefix: '- ', content: 'nested',
        });
    });

    it('parses numbered list', () => {
        expect(parseLineParts('1. first')).toEqual({
            indent: '', prefix: '1. ', content: 'first',
        });
    });

    it('parses numbered list with parenthesis', () => {
        expect(parseLineParts('2) second')).toEqual({
            indent: '', prefix: '2) ', content: 'second',
        });
    });

    it('parses todo checkbox', () => {
        expect(parseLineParts('- [ ] task')).toEqual({
            indent: '', prefix: '- [ ] ', content: 'task',
        });
    });

    it('parses checked todo', () => {
        expect(parseLineParts('- [x] done')).toEqual({
            indent: '', prefix: '- [x] ', content: 'done',
        });
    });

    it('parses indented todo', () => {
        expect(parseLineParts('  - [ ] sub task')).toEqual({
            indent: '  ', prefix: '- [ ] ', content: 'sub task',
        });
    });

    it('parses empty line', () => {
        expect(parseLineParts('')).toEqual({
            indent: '', prefix: '', content: '',
        });
    });
});

describe('convertLine', () => {
    it('converts plain text to heading', () => {
        expect(convertLine('hello', 'h1', 1)).toBe('# hello');
    });

    it('converts heading to paragraph', () => {
        expect(convertLine('## heading', 'paragraph', 1)).toBe('heading');
    });

    it('converts bullet to heading', () => {
        expect(convertLine('- item', 'h2', 1)).toBe('## item');
    });

    it('converts heading to bullet', () => {
        expect(convertLine('### title', 'bullet', 1)).toBe('- title');
    });

    it('converts plain to todo', () => {
        expect(convertLine('task', 'todo', 1)).toBe('- [ ] task');
    });

    it('converts bullet to todo', () => {
        expect(convertLine('- item', 'todo', 1)).toBe('- [ ] item');
    });

    it('converts todo to bullet', () => {
        expect(convertLine('- [ ] task', 'bullet', 1)).toBe('- task');
    });

    it('converts plain to numbered', () => {
        expect(convertLine('item', 'numbered', 3)).toBe('3. item');
    });

    it('preserves indentation', () => {
        expect(convertLine('    - nested', 'h1', 1)).toBe('    # nested');
    });

    it('converts indented todo to paragraph', () => {
        expect(convertLine('  - [x] done', 'paragraph', 1)).toBe('  done');
    });
});

describe('convertLines', () => {
    it('converts multiple lines to headings', () => {
        const lines = ['first', '- second', '## third'];
        expect(convertLines(lines, 'h1')).toEqual([
            '# first', '# second', '# third',
        ]);
    });

    it('numbers lines sequentially for numbered lists', () => {
        const lines = ['alpha', '- beta', 'gamma'];
        expect(convertLines(lines, 'numbered')).toEqual([
            '1. alpha', '2. beta', '3. gamma',
        ]);
    });

    it('converts all to bullet', () => {
        const lines = ['## heading', '1. numbered', '- [ ] todo'];
        expect(convertLines(lines, 'bullet')).toEqual([
            '- heading', '- numbered', '- todo',
        ]);
    });

    it('converts all to todo', () => {
        const lines = ['plain', '- bullet'];
        expect(convertLines(lines, 'todo')).toEqual([
            '- [ ] plain', '- [ ] bullet',
        ]);
    });

    it('preserves indentation across lines', () => {
        const lines = ['root', '  child', '    grandchild'];
        expect(convertLines(lines, 'bullet')).toEqual([
            '- root', '  - child', '    - grandchild',
        ]);
    });

    it('handles empty lines', () => {
        const lines = ['text', '', 'more'];
        expect(convertLines(lines, 'h2')).toEqual([
            '## text', '## ', '## more',
        ]);
    });

    const allTypes: BlockType[] = ['paragraph', 'h1', 'h2', 'h3', 'todo', 'bullet', 'numbered'];

    for (const from of allTypes) {
        for (const to of allTypes) {
            it(`converts ${from} → ${to}`, () => {
                const sampleLine = convertLine('content', from, 1);
                const result = convertLine(sampleLine, to, 1);
                const parsed = parseLineParts(result);
                expect(parsed.content).toBe('content');
            });
        }
    }
});
