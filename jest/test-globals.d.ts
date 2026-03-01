interface EditorPosition {
    line: number;
    ch: number;
}

interface EditorState {
    text: string;
    anchor: EditorPosition;
    head: EditorPosition;
}

interface KeydownData {
    key: string;
    code?: string;
    ctrlKey?: boolean;
    metaKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
}

declare function applyState(state: EditorState): Promise<void>;
declare function getCurrentState(): Promise<EditorState>;
declare function executeCommand(commandId: string): Promise<void>;
declare function simulateKeydown(keyData: KeydownData): Promise<void>;
declare function parseState(stateStr: string): EditorState;

declare namespace jest {
    interface Matchers<R> {
        toEqualEditorState(expected: EditorState): R;
    }
}
