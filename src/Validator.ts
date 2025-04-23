import * as vscode from 'vscode';
import { Message } from './VsCodeUtils';


export class ValidateAndGet {
    private message = new Message();
    document?: vscode.TextDocument;
    editor?: vscode.TextEditor;

    getActiveDoc() {
        let editor = this.editor;
        editor = vscode.window.activeTextEditor;
        if (!editor) {
            this.message.err("No active text-editor");
            return;
        }
        this.editor = editor;
        this.document = vscode.window.activeTextEditor?.document;
        return this.document;
    }

    isThisYamlDoc(): boolean {
        this.getActiveDoc();
        if (!this.document || this.document.languageId !== "yaml") {
            vscode.window.showErrorMessage("This command only works with YAML files.");
            return false;
        }
        return true
    }

    getCursorPosition() { // place this into misc
        if (!this.editor) return;
        return this.editor.selection.active;
    }
}