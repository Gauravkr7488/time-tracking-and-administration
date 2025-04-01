import * as vscode from 'vscode';

export class YamlKeyExtractor {
    private document: vscode.TextDocument;
    private position: vscode.Position;
    private extractedSymbols: Array<string>;

    constructor(document: vscode.TextDocument, position: vscode.Position) {
        this.document = document;
        this.position = position;
        this.extractedSymbols = [];
    }

    async extractYamlKey() {
        let symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            this.document.uri
        );
        if (symbols === undefined) {
            return;
        }

        this.cursorSymbols(symbols);
    }

    fullPath(): string {
        // Fetch separator and ignored words from settings
        const config = vscode.workspace.getConfiguration('F2ToolInterface');
        const separator = config.get<string>('pathSeparator', '.');
        const ignoreWords: string[] = config.get<string[]>('ignoreWords', []);


        console.log('Separator:', separator);
        console.log('Ignore Words:', ignoreWords);
        console.log('Extracted Symbols:', this.extractedSymbols);
        // Filter out ignored words from extracted YAML keys
        let filteredSymbols = this.extractedSymbols.map(symbol => {
            ignoreWords.forEach(word => {
                symbol = symbol.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
            });
            return symbol;
        }).filter(symbol => symbol !== '');

        return filteredSymbols.join(separator);
    }

    private cursorSymbols(symbols: vscode.DocumentSymbol[]) {
        for (const symbol of symbols) {
            if (!symbol.range.contains(this.position)) {
                continue;
            }

            if (this.shouldAddSymbol(symbol)) {
                this.extractedSymbols.push(symbol.name);
            }

            if (!symbol.children) {
                return;
            }

            this.cursorSymbols(symbol.children);
        }
    }

    private shouldAddSymbol(symbol: vscode.DocumentSymbol): boolean {
        const config = vscode.workspace.getConfiguration('yamlPathExtractor');
        const ignoreFilenameRoot = config.get<boolean>('ignoreFilenameRoot', false);

        if (!ignoreFilenameRoot) {
            return true;
        }

        let fileName = this.document.fileName;
        fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
        return (
            this.extractedSymbols.length > 0 ||
            symbol.name !== fileName.substring(0, fileName.lastIndexOf('.'))
        );
    }
}
