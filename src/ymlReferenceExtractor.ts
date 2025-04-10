import * as vscode from 'vscode';
import * as path from 'path';

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

export class YamlKeyExtractor {
    private extractedSymbols: Array<string>;

    constructor() {
        this.extractedSymbols = [];
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

    async extractYamlKey() {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor.");
            return;
        }
        const document = editor.document;
        const position = editor.selection.active;

        let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );
        if (symbols === undefined) {
            return;
        }

        this.cursorSymbols(symbols, position);
    }

    fullPath(): string {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return '';
        }
        const document = editor.document;

        const fileName = path.basename(document.fileName, path.extname(document.fileName));

        const config = vscode.workspace.getConfiguration('F2ToolInterface'); // The config is coming from F2ToolInterface which is a different extension for making yml links.
        const separator = config.get<string>('pathSeparator', '.');
        const ignoreWords: string[] = config.get<string[]>('ignoreWords', []);

        let filteredSymbols = this.extractedSymbols.map(symbol => {
            ignoreWords.forEach(word => {
                symbol = symbol.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
            });
            return symbol;
        }).filter(symbol => symbol !== '');

        const pathFromRoot = filteredSymbols.join(separator);
        return `${fileName}/${pathFromRoot}`;
    }

    public createYmlReference(): string {
        let fullPath = this.fullPath(); // Call private fullPath method
        if (!fullPath) {
            vscode.window.showErrorMessage("No full path extracted.");
        }
        vscode.window.showInformationMessage(`'${fullPath}' Selected`);
        let formattedText = `-->${fullPath}<:`;
        this.extractedSymbols = []; // Reset symbols after generating the link
        return formattedText;
    }

    private cursorSymbols(symbols: vscode.DocumentSymbol[], position: vscode.Position) {
        for (const symbol of symbols) {
            if (!symbol.range.contains(position)) {
                continue;
            }

            if (this.shouldAddSymbol(symbol)) {
                this.extractedSymbols.push(symbol.name);
            }

            if (!symbol.children) {
                return;
            }

            this.cursorSymbols(symbol.children, position);
        }
    }

    private shouldAddSymbol(symbol: vscode.DocumentSymbol): boolean {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return false;
        }
        const document = editor.document;

        const config = vscode.workspace.getConfiguration('yamlPathExtractor');
        const ignoreFilenameRoot = config.get<boolean>('ignoreFilenameRoot', false);

        if (!ignoreFilenameRoot) {
            return true;
        }

        const fileName = path.basename(document.fileName, path.extname(document.fileName));
        return (
            this.extractedSymbols.length > 0 ||
            symbol.name !== fileName
        );
    }
}