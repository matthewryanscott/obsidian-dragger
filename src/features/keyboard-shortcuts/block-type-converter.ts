import { Editor } from 'obsidian';

export type BlockType =
    | 'paragraph'
    | 'h1' | 'h2' | 'h3'
    | 'todo'
    | 'bullet'
    | 'numbered';

export interface ParsedLineParts {
    indent: string;
    prefix: string;
    content: string;
}

const LINE_PREFIX_RE = /^(\s*)(#{1,6}\s+|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)?(.*)$/;

export function parseLineParts(line: string): ParsedLineParts {
    const match = line.match(LINE_PREFIX_RE);
    if (!match) {
        return { indent: '', prefix: '', content: line };
    }
    return {
        indent: match[1],
        prefix: match[2] ?? '',
        content: match[3],
    };
}

export function buildPrefix(type: BlockType, sequenceNumber: number): string {
    switch (type) {
        case 'paragraph': return '';
        case 'h1': return '# ';
        case 'h2': return '## ';
        case 'h3': return '### ';
        case 'todo': return '- [ ] ';
        case 'bullet': return '- ';
        case 'numbered': return `${sequenceNumber}. `;
    }
}

export function convertLine(line: string, targetType: BlockType, sequenceNumber: number): string {
    const { indent, content } = parseLineParts(line);
    const newPrefix = buildPrefix(targetType, sequenceNumber);
    return indent + newPrefix + content;
}

export function convertLines(lines: string[], targetType: BlockType): string[] {
    let seq = 1;
    return lines.map(line => {
        const result = convertLine(line, targetType, seq);
        if (targetType === 'numbered') seq++;
        return result;
    });
}

export function convertBlockType(editor: Editor, targetType: BlockType): void {
    const fromLine = editor.getCursor('from').line;
    const toLine = editor.getCursor('to').line;

    const lines: string[] = [];
    for (let i = fromLine; i <= toLine; i++) {
        lines.push(editor.getLine(i));
    }

    const converted = convertLines(lines, targetType);

    for (let i = fromLine; i <= toLine; i++) {
        const lineLength = editor.getLine(i).length;
        editor.replaceRange(
            converted[i - fromLine],
            { line: i, ch: 0 },
            { line: i, ch: lineLength }
        );
    }
}
