import DragNDropPlugin from '../main';
import { MarkdownView, Editor } from 'obsidian';

interface TestMessage {
    type: string;
    id?: string;
    data?: any;
}

interface TestResponse {
    id?: string;
    type: string;
    data?: any;
    error?: string;
}

export default class DragNDropPluginWithTests extends DragNDropPlugin {
    private ws: WebSocket | null = null;

    async onload() {
        await super.onload();
        this.connectWebSocket();
    }

    onunload() {
        super.onunload();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private connectWebSocket(): void {
        const port = 3001;
        try {
            this.ws = new WebSocket(`ws://localhost:${port}`);
            this.ws.onopen = () => {
                console.log('[Dragger Test Bridge] Connected to test server');
            };
            this.ws.onmessage = (event) => {
                try {
                    const msg: TestMessage = JSON.parse(event.data as string);
                    this.handleTestMessage(msg);
                } catch (e) {
                    console.error('[Dragger Test Bridge] Failed to parse message:', e);
                }
            };
            this.ws.onclose = () => {
                console.log('[Dragger Test Bridge] Disconnected from test server');
                // Reconnect after delay
                setTimeout(() => this.connectWebSocket(), 2000);
            };
            this.ws.onerror = (err) => {
                console.error('[Dragger Test Bridge] WebSocket error:', err);
            };
        } catch (e) {
            console.error('[Dragger Test Bridge] Failed to connect:', e);
        }
    }

    private send(response: TestResponse): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(response));
        }
    }

    private handleTestMessage(msg: TestMessage): void {
        try {
            switch (msg.type) {
                case 'applyState':
                    this.applyState(msg.data);
                    this.send({ id: msg.id, type: 'ok' });
                    break;
                case 'getCurrentState':
                    this.send({ id: msg.id, type: 'state', data: this.getCurrentState() });
                    break;
                case 'executeCommandById':
                    (this.app as any).commands.executeCommandById(msg.data.commandId);
                    this.send({ id: msg.id, type: 'ok' });
                    break;
                case 'simulateKeydown':
                    this.simulateKeydown(msg.data);
                    this.send({ id: msg.id, type: 'ok' });
                    break;
                case 'parseState':
                    this.send({ id: msg.id, type: 'parsed', data: this.parseStateString(msg.data.state) });
                    break;
                case 'resetSettings':
                    this.loadSettings().then(() => {
                        this.send({ id: msg.id, type: 'ok' });
                    });
                    break;
                default:
                    this.send({ id: msg.id, type: 'error', error: `Unknown message type: ${msg.type}` });
            }
        } catch (e) {
            this.send({ id: msg.id, type: 'error', error: String(e) });
        }
    }

    private getActiveEditor(): Editor | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        return view?.editor ?? null;
    }

    private getActiveMarkdownView(): MarkdownView | null {
        return this.app.workspace.getActiveViewOfType(MarkdownView);
    }

    private applyState(data: { text: string; anchor: { line: number; ch: number }; head: { line: number; ch: number } }): void {
        const editor = this.getActiveEditor();
        if (!editor) throw new Error('No active editor');
        editor.setValue(data.text);
        editor.setSelection(data.anchor, data.head);
    }

    private getCurrentState(): { text: string; anchor: { line: number; ch: number }; head: { line: number; ch: number } } {
        const editor = this.getActiveEditor();
        if (!editor) throw new Error('No active editor');
        return {
            text: editor.getValue(),
            anchor: editor.getCursor('anchor'),
            head: editor.getCursor('head'),
        };
    }

    private simulateKeydown(data: { key: string; code?: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; shiftKey?: boolean }): void {
        const view = this.getActiveMarkdownView();
        if (!view) throw new Error('No active markdown view');

        // Access CodeMirror's contentDOM for keyboard event dispatch
        const cmEditor = (view.editor as any).cm as { contentDOM: HTMLElement } | undefined;
        if (!cmEditor?.contentDOM) throw new Error('Cannot access CodeMirror contentDOM');

        const event = new KeyboardEvent('keydown', {
            key: data.key,
            code: data.code ?? data.key,
            ctrlKey: data.ctrlKey ?? false,
            metaKey: data.metaKey ?? false,
            altKey: data.altKey ?? false,
            shiftKey: data.shiftKey ?? false,
            bubbles: true,
            cancelable: true,
        });
        cmEditor.contentDOM.dispatchEvent(event);
    }

    private parseStateString(stateStr: string): { text: string; anchor: { line: number; ch: number }; head: { line: number; ch: number } } {
        // Parse a state string with cursor markers:
        // | = cursor position (collapsed selection)
        // Selection is represented by the text between two | markers
        const lines = stateStr.split('\n');
        let anchor: { line: number; ch: number } | null = null;
        let head: { line: number; ch: number } | null = null;
        const cleanLines: string[] = [];

        let cursorCount = 0;
        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            let line = lines[lineIdx];
            let cleanLine = '';
            let chOffset = 0;

            for (let i = 0; i < line.length; i++) {
                if (line[i] === '|') {
                    const pos = { line: lineIdx, ch: chOffset };
                    if (cursorCount === 0) {
                        anchor = pos;
                    } else {
                        head = pos;
                    }
                    cursorCount++;
                } else {
                    cleanLine += line[i];
                    chOffset++;
                }
            }
            cleanLines.push(cleanLine);
        }

        if (!anchor) throw new Error('No cursor marker found in state string');
        if (!head) head = anchor;

        return { text: cleanLines.join('\n'), anchor, head };
    }
}
