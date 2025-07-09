import * as vscode from 'vscode';
import { Data } from './Data';
import path from 'path';


export class VsCodeUtils {

    static getFileUri(filePath: any): vscode.Uri {
        let fileUri;
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const rootPath = config.get<string>('rootPath');
        if (!rootPath) throw new Error("root path is not set") // todo 
        const filePathFromRoot = rootPath + "\\" + filePath;
        fileUri = vscode.Uri.file(path.resolve(filePathFromRoot));
        return  fileUri;

    }

    static getActiveDoc() {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TEXT_EDITOR);
            return;
        }
        const activeDocument = activeEditor.document;
        return activeDocument;
    }

    static getActiveEditor() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TEXT_EDITOR);
            return;
        }
        return activeEditor;
    }

    static isThisYamlDoc(): boolean {
        const activeDocument = this.getActiveDoc();
        if (!activeDocument) return false;
        if (activeDocument.languageId !== Data.MISC.YAML) {
            Message.err(Data.MESSAGES.ERRORS.THIS_COMMAND_ONLY_WORKS_WITH_YAML_FILES);
            return false;
        }
        return true
    }

    static getCursorPosition() {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TEXT_EDITOR);
            return;
        }
        const cursorPosition = activeEditor.selection.active;
        return cursorPosition;
    }

    static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
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
