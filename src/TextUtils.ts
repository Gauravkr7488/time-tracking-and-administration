import { Position } from 'vscode';
import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';

export class TextUtils {
    static escapeCharacter(inputString: string, characterToEscape: string, characterToEscapeWith: string): string {
        let result = '';
        for(const char of inputString){
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
        const srCode = doc.getText(wordRange).replace(Data.REGEX_PATTERNS.COLON, Data.MISC.EMPTY_STRING);

        return srCode;
    }

    public static async isThisYamlLink() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();

        if (!doc) return;
        if (!cursorPosition) return;
        const line = doc.lineAt(cursorPosition.line);
        const lineText = line.text;
        let betterLink = this.findLinkInText(lineText, cursorPosition); // WIP
        return betterLink;
    }
    // -->someting< and -->somethingElse< again -->something"-->entrelyDifferent<"<
    static findLinkInText(lineText: string, cursorPosition: Position) {
        let inLink;
        let startOfLink;
        let endOfLink;
        let inDoubleQuotes = false;
        for (let index = 0; index < cursorPosition.character; index++) {
            if (lineText[index] + lineText[index + 1] + lineText[index + 2] == '-->' && inDoubleQuotes == false) {
                inLink = true
                startOfLink = index;
            }

            if (inLink == true && lineText[index] == '\"') {
                if (inDoubleQuotes == true) {
                    inDoubleQuotes = false
                } else {

                    inDoubleQuotes = true;
                }
            }

            if (lineText[index] == '<' && inDoubleQuotes == false) {
                inLink = false
            }
        }
        if (inLink == true) {
            for (let index = cursorPosition.character - 1; index < lineText.length; index++) {

                if (inLink == true && lineText[index] == '\"') {
                    if (inDoubleQuotes == true) {
                        inDoubleQuotes = false
                    }else{

                        inDoubleQuotes = true;
                    }
                }

                if (lineText[index] == '<' && inDoubleQuotes == false) {
                    endOfLink = index;
                    break;
                }
            }
        }
        let betterLink = "";
        if (startOfLink == undefined || endOfLink == undefined) return;
        for (let index = startOfLink; index <= endOfLink; index++) {
            betterLink += lineText[index];
        }
        return betterLink;
    }

    public static isThisYamlReference() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();

        if (!doc) return;
        if (!cursorPosition) return;
        const line = doc.lineAt(cursorPosition.line);
        const lineText = line.text;
        const referencePattern = Data.REGEX_PATTERNS.REFERENCE;

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