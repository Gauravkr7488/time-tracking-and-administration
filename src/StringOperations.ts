import { Position } from 'vscode';
import { Data } from './Data';
import { VsCodeUtils } from './VsCodeUtils';
import * as vscode from 'vscode';

export class StringOperation {

    static isThisTask(yamlLink: string) {
        const cleanLink = this.removeLinkSymbolsFromLink(yamlLink)
        const keys: string[] = cleanLink.split(".");
        const lastKey = keys[keys.length - 1];
        const firstCharOfLastKey = lastKey[0];
        const lastCharOfLastKey = lastKey[lastKey.length - 1];
        if (firstCharOfLastKey == "\"" && lastCharOfLastKey == "\"") return true;
        return false;
    }

    static removeExtension(filePath: string): string {
        if (filePath.endsWith('.yaml')) {
            return filePath.slice(0, -5);
        } else if (filePath.endsWith('.yml')) {
            return filePath.slice(0, -4);
        }
        return filePath;
    }

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


    static removeQuotesWrappingAndDot(yamlKey: string): string {
        // Remove leading dot if present
        if (yamlKey.startsWith(".")) {
            yamlKey = yamlKey.substring(1);
        }

        // Trim quotes if present
        yamlKey = yamlKey.trim();
        if (yamlKey.startsWith("\"") && yamlKey.endsWith("\"")) {
            yamlKey = yamlKey.substring(1, yamlKey.length - 1);
        }

        return yamlKey;
    }



    // static parseYamlPath(yamlPath: string): string[] {
    //     const rawParts = yamlPath.split(Data.MISC.PATH_SEPERATOR);
    //     const yamlParts: string[] = [];

    //     for (let i = 0; i < rawParts.length; i++) {
    //         if (rawParts[i] !== "") {
    //             yamlParts.push(rawParts[i]);
    //         }
    //     }

    //     return yamlParts;
    // }
    static parseYamlPath(yamlPath: string): string[] {
        const yamlParts: string[] = [];
        let i = 0;
        while (i < yamlPath.length) {
            let dotCount = 0;

            // Count consecutive dots
            while (i < yamlPath.length && yamlPath[i] === ".") {
                dotCount++;
                i++;
            }

            let part = "";

            // Quoted part
            if (yamlPath[i] === "\"") {
                part += "\"";
                i++;
                while (i < yamlPath.length) {
                    part += yamlPath[i];
                    if (yamlPath[i] === "\"") {
                        i++;
                        break;
                    }
                    i++;
                }
            } else {
                // Read until next dot
                while (i < yamlPath.length && yamlPath[i] !== ".") {
                    part += yamlPath[i];
                    i++;
                }
            }

            if (part.length > 0) {
                if (dotCount >= 2) part = "." + part; // only if 2 or more dots before
                yamlParts.push(part);
            }
        }

        return yamlParts;
    }


    static parseF2yamlLink(yamlLink: string): { filePath: string; yamlPath: string; } {
        const cleanLink = this.removeLinkSymbolsFromLink(yamlLink);
        const lastBackslashIndex = StringOperation.getLastIndexOfCharInF2YamlLink(cleanLink, "\\");
        const oldLink = StringOperation.isThisOldLink(cleanLink, lastBackslashIndex);
        if (oldLink) {
            const { filePath, yamlPath } = StringOperation.parseOldLink(cleanLink);
            return { filePath, yamlPath };
        }
        if (lastBackslashIndex === -1) throw new Error(Data.MESSAGES.ERRORS.NOT_VALID_LINK);

        const filePath = cleanLink.slice(0, lastBackslashIndex);
        const yamlPath = cleanLink.slice(lastBackslashIndex + 1);

        return { filePath, yamlPath };
    }

    static parseOldLink(cleanLink: string): { filePath: any; yamlPath: any; } {
        const linkWithSingleBackSlash = cleanLink.split('\\\\').join('\\');
        const lastDotIndex = linkWithSingleBackSlash.indexOf(".");
        if (lastDotIndex === -1) throw new Error(Data.MESSAGES.ERRORS.NOT_VALID_LINK);

        const filePath = linkWithSingleBackSlash.slice(0, lastDotIndex);
        let yamlPath = linkWithSingleBackSlash.slice(lastDotIndex + 1);
        let yamlParts = yamlPath.split(Data.MISC.PATH_SEPERATOR);
        let newParts: string[] = [];
        for (const parts of yamlParts) {
            newParts.push(StringOperation.wrapInQuotesIfMultiWord(parts));
        }
        yamlPath = newParts.join(Data.MISC.PATH_SEPERATOR);
        return { filePath, yamlPath };
    }

    static isThisOldLink(yamlLink: string, lastBackslashIndex: number) {
        if (yamlLink[lastBackslashIndex + 1] != Data.MISC.PATH_SEPERATOR) return true;
        return false;
    }

    static getLastIndexOfCharInF2YamlLink(cleanLink: string, str: string): number {
        let inQuotes = false;
        let lastIndex = -1;
        const strLength = str.length;
        for (let index = 0; index < cleanLink.length; index++) {
            const currChar = cleanLink[index];

            if (currChar == "\"") {
                inQuotes = !inQuotes;
                continue;
            }

            if (!inQuotes && cleanLink.substring(index, index + strLength) === str) {
                lastIndex = index;
            }
        }
        return lastIndex;
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

    public static extractSrCode() {
        const doc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();
        const wordRange = doc.getWordRangeAtPosition(cursorPosition);
        return doc.getText(wordRange).replace(Data.PATTERNS.COLON, Data.MISC.EMPTY_STRING);;
    }

    public static async getYamlLink(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) {
        const line = activeDoc.lineAt(cursorPosition.line);
        const lineText = line.text;
        let f2YamlLink = this.findLinkInText(lineText, cursorPosition);
        return f2YamlLink;
    }

    static findLinkInText(lineText: string, cursorPosition: Position) {
        let f2YamlLink = "";
        let startOfLink;
        startOfLink = StringOperation.getStartOfLink(cursorPosition, lineText);
        let endOfLink;
        if (startOfLink != undefined) endOfLink = StringOperation.getEndOfLink(cursorPosition, lineText);
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
            if (lineText[index] + lineText[index + 1] + lineText[index + 2] == Data.PATTERNS.START_OF_F2YAML_LINK) startOfLink = index;
            if (lineText[index] == Data.PATTERNS.END_OF_F2YAML_LINK) startOfLink = undefined; // when encountering a end of a link the staring point resets.
        }
        return startOfLink;
    }


    static seperateStatusCodeAndTask(str: string): any {
        const indexOfFirstDot = str.indexOf(".");
        if (indexOfFirstDot === -1) return { str }; // No dot found

        const status = str.substring(0, indexOfFirstDot);
        const task = str.substring(indexOfFirstDot + 1); // Skip the dot itself
        return { status, task };
    }


    static removeFirstWordIfFollowedBySpaceAndDotIfWrappendInQuotes(str: string): string {
        if (!str.startsWith('"') || !str.endsWith('"')) return str; // not a quoted string

        const inner = str.slice(1, -1); // Remove outer quotes
        const trimmed = inner.trimStart();
        const firstSpaceIndex = trimmed.indexOf(' ');

        if (firstSpaceIndex === -1) return str;

        if (trimmed[firstSpaceIndex + 1] === '.') {
            const newInner = trimmed.substring(firstSpaceIndex + 2);
            return `${Data.MISC.PATH_SEPERATOR}"${newInner}"`; // Re-wrap in quotes with dot
        }
        return str;
    }

    static isThisSingleWord(string: string) {
        return /^\S+$/.test(string)
    }

    static wrapInQuotesIfMultiWord(str: string): string {
        const trimmed = str.trim();
        if (trimmed.includes(' ') && !trimmed.startsWith('"') && !trimmed.endsWith('"')) return `"${trimmed}"`;
        return trimmed;
    }
}