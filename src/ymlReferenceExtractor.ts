import * as vscode from 'vscode';
import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';
import { YamlTaskOperations } from './YamlOperations';
import * as yaml from 'yaml';


export class YamlKeyExtractor {
    protected static extractedSymbols: Array<string> = []; 

    protected static async extractAllYamlKeys() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        if (!doc) return;
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();
        if (!cursorPosition) return;
        let yamlKeys = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            doc.uri
        );
        if (yamlKeys === undefined) return;
        this.extractYamlKeysToCursor(yamlKeys, cursorPosition);
    }

    private static fullPath(): string { // TODO simplify this
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
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

    public static async createYamlLink() {
        await this.extractAllYamlKeys();
        let fullPath = this.fullPath();
        if (!fullPath) return '';
        let yamlLink = `-->${fullPath}<`;
        this.extractedSymbols = [];
        return yamlLink;
    }

    private static extractYamlKeysToCursor(symbols: vscode.DocumentSymbol[], cursorPosition: vscode.Position) {
        for (const symbol of symbols) {
            if (!symbol.range.contains(cursorPosition)) continue;
            this.extractedSymbols.push(symbol.name);
            if (!symbol.children) return;
            this.extractYamlKeysToCursor(symbol.children, cursorPosition);
        }
    }
}

export class IdLinkCreater extends YamlKeyExtractor {
    public static async createIdLink() {
        await this.extractAllYamlKeys();
        const doc = ActiveDocAndEditor.getActiveDoc();
        if (!doc) return;
        const yamlDoc = await YamlTaskOperations.parseYaml(doc.uri);
        if (!yamlDoc) return;
        let a = this.extractedSymbols; // for test
        const idValues: string[] = await YamlTaskOperations.getIdValues(this.extractedSymbols, yamlDoc);
        this.extractedSymbols = [];
        const idLink = idValues.join(".");
        return `-->${idLink}<`;

    }

    
}