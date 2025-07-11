import { Position } from 'vscode';
import { Data } from './Data';
import { VsCodeUtils } from './VsCodeUtils';
import * as vscode from 'vscode';

export class TextUtils {
    static removeExtraQuotes(yamlLink: string): string {
        return yamlLink.split('""').join('"');
    }


    static getStatusCode(activeDoc: vscode.TextDocument, cursorPosition: Position) {
        let statusCode = ''
        const line = activeDoc.lineAt(cursorPosition.line);
        const seperatedTask = this.seperateStatusCodeAndTask(line.text)
        statusCode = seperatedTask[0];
        return statusCode.trim();
    }
    static escapeSpecialCharacters(keyValueWithSpaces: string): string {
        let sanitisedString = keyValueWithSpaces;

        sanitisedString = this.escapeCharacter(sanitisedString, "(", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, ")", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, ".", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "?", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "+", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "*", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "^", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "$", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "[", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "]", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "{", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "}", "\\");
        sanitisedString = this.escapeCharacter(sanitisedString, "|", "\\");
        // sanitisedString = this.escapeCharacter(sanitisedString, "\\", "\\"); // escape the backslash itself

        return sanitisedString;
    }


    static removeQuotesWrapping(yamlKey: string): string {
        if (
            (yamlKey.startsWith('"') && yamlKey.endsWith('"')) ||
            (yamlKey.startsWith("'") && yamlKey.endsWith("'"))
        ) {
            return yamlKey.slice(1, -1);
        }
        return yamlKey;
    }


    static parseYamlPath(yamlPath: string): string[] {
        const rawParts = yamlPath.split(".");
        const yamlParts: string[] = [];

        for (let i = 0; i < rawParts.length; i++) {
            if (rawParts[i] !== "") {
                yamlParts.push(rawParts[i]);
            }
        }

        return yamlParts;
    }

    static parseF2yamlLink(yamlLink: string): { filePath: any; yamlPath: any; } {
        const cleanLink = this.removeLinkSymbolsFromLink(yamlLink);

        const lastBackslashIndex = cleanLink.lastIndexOf("\\");

        if (lastBackslashIndex === -1) throw new Error("not a valid link"); // TODO

        const filePath = cleanLink.slice(0, lastBackslashIndex);
        const yamlPath = cleanLink.slice(lastBackslashIndex + 1);

        return { filePath, yamlPath };
    }


    private static removeLinkSymbolsFromLink(yamlLink: string) {
        const lengthOfFrontLinkSymbols = 3;
        const lengthOfBackLinkSymbols = 1;
        const cleanYamlLink = yamlLink.slice(lengthOfFrontLinkSymbols, -lengthOfBackLinkSymbols);
        return cleanYamlLink;
    }


    static escapeCharacter(inputString: string, characterToEscape: string, characterToEscapeWith: string): string {
        let result = '';
        for (const char of inputString) {
            if (char === characterToEscape) {
                result += characterToEscapeWith + char;
            } else {
                result += char;
            }
        }
        return result;
    }

    public static extractCurrentWord() {
        const doc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();

        if (!doc) return;
        if (!cursorPosition) return;
        const wordRange = doc.getWordRangeAtPosition(cursorPosition);

        if (!wordRange) return;
        const srCode = doc.getText(wordRange).replace(Data.PATTERNS.COLON, Data.MISC.EMPTY_STRING);

        return srCode;
    }

    public static async isThisYamlLink(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        const line = activeDoc.lineAt(cursorPosition.line);
        const lineText = line.text;
        let f2YamlLink = this.findLinkInText(lineText, cursorPosition);
        return f2YamlLink;
    }

    static findLinkInText(lineText: string, cursorPosition: Position) {
        let f2YamlLink = "";

        let startOfLink;
        startOfLink = TextUtils.getStartOfLink(cursorPosition, lineText);

        let endOfLink;
        if (startOfLink != undefined) endOfLink = TextUtils.getEndOfLink(cursorPosition, lineText);

        if (startOfLink == undefined || endOfLink == undefined) return;
        for (let index = startOfLink; index <= endOfLink; index++) f2YamlLink += lineText[index];

        return f2YamlLink;
    }

    private static getEndOfLink(cursorPosition: Position, lineText: string) {
        let endOfLink;

        for (let index = cursorPosition.character - 1; index < lineText.length; index++) {
            if (lineText[index] == Data.PATTERNS.END_OF_F2YAML_LINK) {
                endOfLink = index;
                break;
            }
        }
        return endOfLink;
    }

    private static getStartOfLink(cursorPosition: Position, lineText: string) {
        let startOfLink;

        for (let index = 0; index < cursorPosition.character; index++) {
            if (lineText[index] + lineText[index + 1] + lineText[index + 2] == Data.PATTERNS.START_OF_F2YAML_LINK) {
                startOfLink = index;
            }

            if (lineText[index] == Data.PATTERNS.END_OF_F2YAML_LINK) {
                startOfLink = undefined; // when encountering a end of a link the staring point resets.
            }
        }
        return startOfLink;
    }

    public static isThisYamlReference() {
        const doc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();

        if (!doc) return;
        if (!cursorPosition) return;
        const line = doc.lineAt(cursorPosition.line);
        const lineText = line.text;
        const referencePattern = Data.PATTERNS.REFERENCE;

        let match;
        while ((match = referencePattern.exec(lineText)) !== null) {  // .exec returns array
            const startChar = match.index;
            const endChar = startChar + match[0].length;

            if (cursorPosition.character >= startChar && cursorPosition.character <= endChar) {
                const link = match[0].toString();
                return link;
            }
        }
        return;
    }

    static seperateStatusCodeAndTask(str: string): string[] {
        const seperator = " ."; // TODO clean
        const seperatedSummary = str.split(seperator);
        return seperatedSummary;
    }

    static removeFirstWordIfFollowedBySpaceAndDotIfWrappendInQuotes(str: string): string {
        if (!str.startsWith('"') || !str.endsWith('"')) return str; // not a quoted string

        const inner = str.slice(1, -1); // Remove outer quotes
        const trimmed = inner.trimStart();
        const firstSpaceIndex = trimmed.indexOf(' ');

        if (firstSpaceIndex === -1) return str;

        if (trimmed[firstSpaceIndex + 1] === '.') {
            const newInner = trimmed.substring(firstSpaceIndex + 2);
            return `."${newInner}"`; // Re-wrap in quotes with dot
        }

        return str;
    }


    static isThisSingleWord(string: string) {
        return /^\S+$/.test(string)
    }

    static wrapInQuotesIfMultiWord(str: string): string {
        const trimmed = str.trim();

        if (trimmed.includes(' ') && !trimmed.startsWith('"') && !trimmed.endsWith('"')) {
            return `"${trimmed}"`;
        }

        return trimmed;
    }

}