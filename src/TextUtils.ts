import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';

export class TextUtils {
    static extractCurrentWord() {
        let doc = ActiveDocAndEditor.getActiveDoc();
        let cursorPosition = ActiveDocAndEditor.getCursorPosition();
        if (!cursorPosition) return;
        let wordRange = doc?.getWordRangeAtPosition(cursorPosition);
        if (!wordRange) return;
        let srCode = doc?.getText(wordRange).replace(Data.REGEX_PATTERNS.COLON, Data.MISC.EMPTY_STRING);
        return srCode;
    }

    static isThisYamlLink() {
        let doc = ActiveDocAndEditor.getActiveDoc();
        if (!doc) return;
        let cursorPosition = ActiveDocAndEditor.getCursorPosition();
        if (!cursorPosition) return;
        let line = doc.lineAt(cursorPosition.line);
        let lineText = line.text;
        let linkPattern = Data.REGEX_PATTERNS.LINK;
        let match;

        while ((match = linkPattern.exec(lineText)) !== null) {  // .exec returns array
            const startChar = match.index;
            const endChar = startChar + match[0].length;

            if (cursorPosition.character >= startChar && cursorPosition.character <= endChar) {
                const link = match[0].toString();
                return link;
            }
        }
        return;
    }

    static isThisYamlReference() {
        let doc = ActiveDocAndEditor.getActiveDoc();
        if (!doc) return;
        let cursorPosition = ActiveDocAndEditor.getCursorPosition();
        if (!cursorPosition) return;
        let line = doc.lineAt(cursorPosition.line);
        let lineText = line.text;
        let referencePattern = Data.REGEX_PATTERNS.REFERENCE;
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