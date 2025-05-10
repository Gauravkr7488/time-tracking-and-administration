import * as vscode from 'vscode';
import { Data } from './Data';


export class ActiveDocAndEditorUtils {

    getActiveDoc() {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TEXT_EDITOR);
            return;
        }
        const activeDocument = activeEditor.document;
        return activeDocument;
    }

    getActiveEditor() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TEXT_EDITOR);
            return;
        }
        return activeEditor;
    }

    isThisYamlDoc(): boolean {
        const activeDocument = this.getActiveDoc();
        if(!activeDocument) return false;
        if (activeDocument.languageId !== Data.MISC.YAML) {
            Message.err(Data.MESSAGES.ERRORS.THIS_COMMAND_ONLY_WORKS_WITH_YAML_FILES);
            return false;
        }
        return true
    }

    getCursorPosition() { 
        const activeEditor = this.getActiveEditor();
        if(!activeEditor) return;
        const cursorPosition = activeEditor.selection.active;
        return cursorPosition;
    }
}

export class Message {
    static info(message: any) {
        vscode.window.showInformationMessage(message);
    }
    static err(message: any) {
        vscode.window.showErrorMessage(message);
    }
}
