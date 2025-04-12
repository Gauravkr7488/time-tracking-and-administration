import * as vscode from 'vscode';

const CONSTANTS = {
    MESSAGES: {
        NO_ACTIVE_EDITOR: "No active text editor.",
        NO_WORD_AT_CURSOR: "No word found at cursor position. Place cursor on a YAML key.",
        NO_LINK_FOUND: "No link found containing the cursor."
    },
    STATE_KEYS: {
        EXTRACTED_YAML_KEY: "extractedYamlKey",
        CAPTURED_DOCUMENT_URI: "capturedDocumentUri",
        DETECTED_YAML_LINK: "detectedYamlLink"
    },
    REGEX_PATTERNS: {
        LINK: /-->.*<\:/g,
        COLON: /:$/
    }
};

export class SimpleStringTools {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private getActiveEditor(): vscode.TextEditor | undefined {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_ACTIVE_EDITOR);
            return;
        }
        return editor;
    }

    private getDocumentAndCursorPosition(): { document: vscode.TextDocument, cursorPosition: vscode.Position } | undefined {
        const editor = this.getActiveEditor();
        if (!editor) return;

        return {
            document: editor.document,
            cursorPosition: editor.selection.active
        };
    }


    public async extractYamlKey(): Promise<void> {

        const context = this.getDocumentAndCursorPosition();
        if (!context) return;
        const { document, cursorPosition } = context; // This is called destructuring

        const wordRange = document.getWordRangeAtPosition(cursorPosition);

        if (!wordRange) {
            vscode.window.showErrorMessage(CONSTANTS.MESSAGES.NO_WORD_AT_CURSOR);
            return;
        }

        const extractedKey = document.getText(wordRange).replace(CONSTANTS.REGEX_PATTERNS.COLON, '');
        await this.context.globalState.update(CONSTANTS.STATE_KEYS.EXTRACTED_YAML_KEY, extractedKey);
        await this.context.globalState.update(CONSTANTS.STATE_KEYS.CAPTURED_DOCUMENT_URI, document.uri.toString());
    }

    public async isSelectedTaskALink(): Promise<string> {

        const context = this.getDocumentAndCursorPosition();
        if (!context) return '';
        const { document, cursorPosition } = context;

        const line = document.lineAt(cursorPosition.line);
        const lineText = line.text;

        const linkPattern = CONSTANTS.REGEX_PATTERNS.LINK;
        let match;

        while ((match = linkPattern.exec(lineText)) !== null) {  // .exec returns array
            const startChar = match.index;
            const endChar = startChar + match[0].length;

            if (cursorPosition.character >= startChar && cursorPosition.character <= endChar) {
                // this.context.globalState.update(CONSTANTS.STATE_KEYS.DETECTED_YAML_LINK, match[0]);
                const link = match[0].toString();
                return link;
            }
        }

        // vscode.window.showInformationMessage(CONSTANTS.MESSAGES.NO_LINK_FOUND);
        return '';
    }
}