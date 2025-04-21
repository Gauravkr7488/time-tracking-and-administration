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
}