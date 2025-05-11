import { Data } from './Data';
import { ActiveDocAndEditor } from './VsCodeUtils';

export class TextUtils {
    static extractCurrentWord() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();

        if (!doc) return;
        if (!cursorPosition) return;
        const wordRange = doc.getWordRangeAtPosition(cursorPosition);

        if (!wordRange) return;
        const srCode = doc.getText(wordRange).replace(Data.REGEX_PATTERNS.COLON, Data.MISC.EMPTY_STRING);

        return srCode;
    }

    static isThisYamlLink() {
        const doc = ActiveDocAndEditor.getActiveDoc();
        const cursorPosition = ActiveDocAndEditor.getCursorPosition();
        
        if (!doc) return; 
        if (!cursorPosition) return;
        const line = doc.lineAt(cursorPosition.line);
        const lineText = line.text;
        const linkPattern = Data.REGEX_PATTERNS.LINK;

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