import * as vscode from 'vscode';
import * as path from 'path';

const CONSTANTS = {
    MESSAGES: {
        NO_ACTIVE_EDITOR: "No active text editor.",
    },
    CONFIG:{
        EXTENSION_FOR_MAKING_LINKS: "F2ToolInterface"
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

    private async extractAllYamlKeys() {
        const context = this.getDocumentAndCursorPosition();
        if (!context) return;
        const { document, cursorPosition } = context;

        let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            document.uri
        );

        if (symbols === undefined) return;

        this.extractYamlKeysToCursor(symbols, cursorPosition);
    }

    private fullPath(): string {
        const context = this.getDocumentAndCursorPosition();
        if (!context) return '';
        const { document } = context;

        // const fileName = path.basename(document.fileName, path.extname(document.fileName)); // we dont need this Right now

        const config = vscode.workspace.getConfiguration(CONSTANTS.CONFIG.EXTENSION_FOR_MAKING_LINKS);
        const separator = config.get<string>('pathSeparator', '.');
        const ignoreWords: string[] = config.get<string[]>('ignoreWords', []);

        let filteredSymbols = this.extractedSymbols.map(symbol => {
            ignoreWords.forEach(word => {
                symbol = symbol.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
            });
            return symbol;
        }).filter(symbol => symbol !== '');

        const pathFromRoot = filteredSymbols.join(separator);
        return `${pathFromRoot}`;
    }

    public async createYamlLink() {
       await this.extractAllYamlKeys();
        let fullPath = this.fullPath();
        if (!fullPath) return '';

        // vscode.window.showInformationMessage(`'${fullPath}' Selected`);

        let yamlLink = `-->${fullPath}<:`;
        this.extractedSymbols = []; 
        return yamlLink;
    }

    private extractYamlKeysToCursor(symbols: vscode.DocumentSymbol[], cursorPosition: vscode.Position) {
        for (const symbol of symbols) {
            if (!symbol.range.contains(cursorPosition)) continue;

            this.extractedSymbols.push(symbol.name);

            if (!symbol.children) return;

            this.extractYamlKeysToCursor(symbol.children, cursorPosition);
        }
    }
}