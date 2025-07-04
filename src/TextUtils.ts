import { Position } from 'vscode';
import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';
import * as vscode from 'vscode';

export class TextUtils {
    static escapeCharacter(inputString: string, characterToEscape: string, characterToEscapeWith: string): string {
        let result = '';
        for (const char of inputString) {
            result += char
            if (char == characterToEscape) {
                result += characterToEscapeWith;
            }
        }
        return result;
    }
    public static extractCurrentWord() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();

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
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();

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
}