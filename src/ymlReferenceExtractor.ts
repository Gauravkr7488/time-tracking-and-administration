import * as vscode from 'vscode';
import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';
import { YamlTaskOperation } from './YamlOperations';
import * as yaml from 'yaml';


export class YamlKeyExtractor {
    protected static extractedSymbols: Array<string> = []; // TODO remove this

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

    public static async createYamlLink() { // TODO move this somewhre else
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
        const yamlDoc = await YamlTaskOperation.parseYaml(doc.uri);
        if (!yamlDoc) return;
        let a = this.extractedSymbols; // for test
        const idValues: string[] = await this.getIdValues(this.extractedSymbols, yamlDoc);
        this.extractedSymbols = [];
        const idLink = idValues.join(".");
        return `-->${idLink}<`;

    }

    static async getIdValues(yamlKeys: string[], yamlDoc: yaml.Document) {
        let idValues = []
        const fileAndFolderName = yamlKeys[0];
        const topLevelObj: any = yamlDoc.get(fileAndFolderName);
        let parentObj = topLevelObj;
        let childObj;
        let idObj;
        let idValue;

        for (let index = 1; index < yamlKeys.length; index++) {
            let currentYamlKey = yamlKeys[index];
            for (const item of parentObj.items) {
                if (currentYamlKey == item.key.value) {
                    try {
                        for (const i of item.value.items) {
                            if (i.key.value == "Id") {
                                idObj = i;
                                idValue = idObj.value.value;
                            }
                        }
                    } catch (error) {

                    }
                    currentYamlKey = await YamlTaskOperation.cleanStatusCodesFromKeys(currentYamlKey);
                    if (!idValue) {
                        if (/^\S+$/.test(currentYamlKey)) {
                            idValue = currentYamlKey;
                        } else {
                            idValue = `"${currentYamlKey}"`;
                        }
                    }
                    idValues.push(idValue);
                    idValue = null;

                    parentObj = item.value;
                    break;
                }
            }

        }
        return idValues;
    }
}