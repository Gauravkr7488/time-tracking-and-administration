import * as vscode from 'vscode';
import { Data } from './Data';
import { ActiveDocAndEditor, Message } from './VsCodeUtils';
import { YamlTaskOperations } from './YamlOperations';
import { TextUtils } from './TextUtils';


export class F2yamlLinkExtractor { // parsing should be used
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

    public static async createF2YamlSummaryLink(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        let F2YamlSummaryLink = '';
        let filePath = activeDoc.uri.fsPath; // TODO make a setting for root directory
        filePath = this.removeRootPath(filePath);
        let yamlPath = await this.getYamlPath(activeDoc, cursorPosition);
        return F2YamlSummaryLink = Data.PATTERNS.START_OF_F2YAML_LINK + filePath + "\\" + yamlPath + Data.PATTERNS.END_OF_F2YAML_LINK;
    }

    static async getYamlPath(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position, yamlKeyType: string = "summary") {
        let yamlPath = '';
        let yamlKeys = await this.getYamlKeys(activeDoc, cursorPosition)
        if (!yamlKeys) return;
        let yamlParts: string[] = this.removeStatus(yamlKeys);
        return yamlPath = yamlParts.join('.');
    }

    static removeStatus(yamlKeys: string[]): string[] {
        let cleanYamlKeys: string[] = []
        for (let yamlKey of yamlKeys) {
            cleanYamlKeys.push(TextUtils.removeFirstWordIfFollowedByDot(yamlKey));
        }
        return cleanYamlKeys;
    }

    static async getYamlKeys(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        ActiveDocAndEditor.isThisYamlDoc();
        let allYamlKeys = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            activeDoc.uri
        );
        let yamlKeysToCursor = this.extractYamlKeysToCursor(allYamlKeys, cursorPosition);
        return yamlKeysToCursor;
    }

    static removeRootPath(filePath: string) {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const rootPath = config.get<string>('rootPath') + "\\";

        if (!rootPath) {
            Message.err(Data.MESSAGES.ERRORS.NO_ROOT_PATH);
            return filePath;
        }

        if (filePath.startsWith(rootPath)) {
            return filePath.substring(rootPath.length);
        } else {
            return filePath;
        }
    }

    private static extractYamlKeysToCursor(
        allYamlKeys: vscode.DocumentSymbol[],
        cursorPosition: vscode.Position
    ): string[] {
        for (const key of allYamlKeys) {
            if (!key.range.contains(cursorPosition)) continue;

            const yamlKeys: string[] = [key.name];

            if (key.children && key.children.length > 0) {
                const childKeys = this.extractYamlKeysToCursor(key.children, cursorPosition);
                yamlKeys.push(...childKeys);
            }

            return yamlKeys; // return only the first matching path
        }

        return [];
    }


    public static async createIdLink() {
        await this.extractAllYamlKeys();
        const doc = ActiveDocAndEditor.getActiveDoc();
        if (!doc) return;
        const yamlDoc = await YamlTaskOperations.parseYaml(doc.uri);
        if (!yamlDoc) return;
        const idValues: string[] = await YamlTaskOperations.getIdValues(this.extractedSymbols, yamlDoc);
        if (!yamlDoc || !yamlDoc.contents) return;
        const fileAndFolderName = this.extractedSymbols[0];
        this.extractedSymbols = [];
        let idLink = idValues.join(".");
        idLink = fileAndFolderName + idLink;
        return `-->${idLink}<`;

    }
}