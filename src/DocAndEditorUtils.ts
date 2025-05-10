import * as vscode from 'vscode';
import { Message } from './VsCodeUtils';


export class ActiveDocAndEditorUtils {
    private message = new Message();

    getActiveDoc() {
        const activeEditor = this.getActiveEditor();
        if (!activeEditor) {
            this.message.err("No active text-editor");
            return;
        }
        const activeDocument = activeEditor.document;
        return activeDocument;
    }

    getActiveEditor() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            this.message.err("No active text-editor");
            return;
        }
        return activeEditor;
    }

    isThisYamlDoc(): boolean {
        const activeDocument = this.getActiveDoc();
        if(!activeDocument) return false;
        if (activeDocument.languageId !== "yaml") {
            this.message.err("This command only works with YAML files.");
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