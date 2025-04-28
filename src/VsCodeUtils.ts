import * as vscode from 'vscode';
import { ValidateAndGet } from './Validator';

export class Message {
    info(message: string) {
        vscode.window.showInformationMessage(message);
    }
    err(message: string) {
        vscode.window.showErrorMessage(message);
    }
}

let message = new Message();
export class TextUtils {
    private validateAndGet = new ValidateAndGet();
    extractCurrentWord() {
        let doc = this.validateAndGet.getActiveDoc();
        let cursorPosition = this.validateAndGet.getCursorPosition();
        if (!cursorPosition) return;
        let wordRange = doc?.getWordRangeAtPosition(cursorPosition);
        if (!wordRange) return;
        let srCode = doc?.getText(wordRange).replace(/:$/,'');
        return srCode;
    }

    isThisYamlLink(): string{
        let doc = this.validateAndGet.getActiveDoc();
        if(!doc) return '';
        let cursorPosition = this.validateAndGet.getCursorPosition();
        if(!cursorPosition) return '';
        let line = doc.lineAt(cursorPosition.line);
        let lineText = line.text;
        let linkPattern = /-->.*</g;
        let match;

        while ((match = linkPattern.exec(lineText)) !== null) {  // .exec returns array
            const startChar = match.index;
            const endChar = startChar + match[0].length;

            if (cursorPosition.character >= startChar && cursorPosition.character <= endChar) {
                const link = match[0].toString();
                return link;
            }
        }
        return '';
    }
}