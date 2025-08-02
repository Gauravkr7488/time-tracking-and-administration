import * as vscode from 'vscode';
import { Data } from './Data';
import { VsCodeUtils, Message } from './VsCodeUtils';
import { YamlTaskOperations } from './YamlOperations';
import { StringOperation } from './StringOperations';


export class F2yamlLinkExtractor { // parsing should be used
    protected static extractedSymbols: Array<string> = [];

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

    public static async createF2YamlSummaryLink(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        let F2YamlSummaryLink = '';
        let filePath = activeDoc.uri.fsPath;
        filePath = this.removeRootPath(filePath);
        filePath = StringOperation.removeExtension(filePath);
        let yamlPath = await this.getYamlPath(activeDoc, cursorPosition);
        return F2YamlSummaryLink = Data.PATTERNS.START_OF_F2YAML_LINK + filePath + "\\" + "." + yamlPath + Data.PATTERNS.END_OF_F2YAML_LINK;
    }

    static async getYamlPath(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position, yamlKeyType: string = "summary") {
        let yamlPath = '';
        let yamlKeys = await this.getYamlKeys(activeDoc, cursorPosition)
        if (!yamlKeys) return;
        let yamlKeyValues;
        if (yamlKeyType != "summary") {
            yamlKeyValues = await YamlTaskOperations.getYamlKeyValues(yamlKeys, yamlKeyType, activeDoc)
            if (!yamlKeyValues) return;
            let yamlParts: string[] = this.removeStatus(yamlKeyValues);
            return yamlPath = yamlParts.join('.');
        }

        let summaryYamlParts = [];
        for (const key of yamlKeys) {
            if (StringOperation.isFirstCharDot(key)) { // TODO: This is just a quick and dirty fix
                let keyString = key.slice(1);
                keyString = "." + StringOperation.wrapInQuotes(keyString)
                summaryYamlParts.push(keyString);
                continue;
            }
            summaryYamlParts.push(StringOperation.wrapInQuotesIfMultiWord(key));
        }
        let cleanSymmaryKeys = this.removeStatus(summaryYamlParts);
        return yamlPath = cleanSymmaryKeys.join('.');
    }

    static removeStatus(yamlKeys: string[]): string[] {
        let cleanYamlKeys: string[] = []
        for (let yamlKey of yamlKeys) {
            cleanYamlKeys.push(StringOperation.removeFirstWordIfFollowedBySpaceAndDotIfWrappendInQuotes(yamlKey));
        }
        return cleanYamlKeys;
    }

    static async getYamlKeys(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        VsCodeUtils.isThisYamlDoc();
        let allYamlKeys;

        if (allYamlKeys == undefined) { // this block is here because of the delay in vscode to load the symbols which result in undefined allYamlKeys
            let tries = 1
            while (true) {
                VsCodeUtils.sleep(5000);
                allYamlKeys = await F2yamlLinkExtractor.getVsCodeDocSymbols(activeDoc);
                tries++;
                if (tries >= 3) {

                    Message.err("executeDocumentSymbolProvider failed \n check if there is some error in yaml like +: { }:")
                    return;
                } else if (allYamlKeys) break;
            }
        }

        let yamlKeysToCursor = this.extractYamlKeysToCursor(allYamlKeys, cursorPosition);
        return yamlKeysToCursor;
    }

    private static async getVsCodeDocSymbols(activeDoc: vscode.TextDocument) {
        return await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
            'vscode.executeDocumentSymbolProvider',
            activeDoc.uri
        );
    }

    static removeRootPath(filePath: string) {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME); // todo replace with method in the vscode utils
        // const rootPath = config.get<string>('pathFromRoot') + "\\"; 
        const rootPath = VsCodeUtils.getRootPath();

        if (!rootPath) {
            Message.err(Data.MESSAGES.ERRORS.NO_ROOT_PATH);
            return filePath;
        }

        if (filePath.startsWith(rootPath)) {
            let shortFilePath = filePath.substring(rootPath.length);
            shortFilePath = shortFilePath.slice(1);
            return shortFilePath;
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


    // public static async createF2YamlIdLink() {
    //     await this.extractAllYamlKeys();
    //     const doc = ActiveDocAndEditor.getActiveDoc();
    //     if (!doc) return;
    //     const yamlDoc = await YamlTaskOperations.parseYaml(doc.uri);
    //     if (!yamlDoc) return;
    //     const idValues: string[] = await YamlTaskOperations.getIdValues(this.extractedSymbols, yamlDoc);
    //     if (!yamlDoc || !yamlDoc.contents) return;
    //     const fileAndFolderName = this.extractedSymbols[0];
    //     this.extractedSymbols = [];
    //     let idLink = idValues.join(".");
    //     idLink = fileAndFolderName + idLink;
    //     return `-->${idLink}<`;

    // }

    static async createF2YamlIdLink(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        let F2YamlIdLink = '';
        let filePath = activeDoc.uri.fsPath;
        filePath = this.removeRootPath(filePath);
        filePath = StringOperation.removeExtension(filePath);
        let yamlPath = await this.getYamlPath(activeDoc, cursorPosition, "Id");
        return F2YamlIdLink = Data.PATTERNS.START_OF_F2YAML_LINK + filePath + "\\" + "." + yamlPath + Data.PATTERNS.END_OF_F2YAML_LINK;

    }
}