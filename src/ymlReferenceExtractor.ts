import * as vscode from 'vscode';

export class YamlKeyExtractor {
    private extractedSymbols: Array<string>;

    constructor() {
        this.extractedSymbols = [];
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
        const config = vscode.workspace.getConfiguration('F2ToolInterface');
        const separator = config.get<string>('pathSeparator', '.');
        const ignoreWords: string[] = config.get<string[]>('ignoreWords', []);

        console.log('Separator:', separator);
        console.log('Ignore Words:', ignoreWords);
        console.log('Extracted Symbols:', this.extractedSymbols);

        let filteredSymbols = this.extractedSymbols.map(symbol => {
            ignoreWords.forEach(word => {
                symbol = symbol.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
            });
            return symbol;
        }).filter(symbol => symbol !== '');

        return filteredSymbols.join(separator);
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
            return false; // Silently fail if no editor; could show message if preferred
        }
        const document = editor.document;

        const config = vscode.workspace.getConfiguration('yamlPathExtractor');
        const ignoreFilenameRoot = config.get<boolean>('ignoreFilenameRoot', false);

        if (!ignoreFilenameRoot) {
            return true;
        }

        let fileName = document.fileName;
        fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
        return (
            this.extractedSymbols.length > 0 ||
            symbol.name !== fileName.substring(0, fileName.lastIndexOf('.'))
        );
    }
}