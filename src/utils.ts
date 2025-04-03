import * as vscode from 'vscode';

export class Utils {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public async extractYamlKey(): Promise<void> {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor.");
            return;
        }

        const document = editor.document;
        const cursorPosition = editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(cursorPosition);
        
        if (!wordRange) {
            vscode.window.showErrorMessage("No word found at cursor position. Place cursor on a YAML key.");
            return;
        }

        const extractedKey = document.getText(wordRange).replace(/:$/, ''); // The replace part is for removal of colon using regex


        await this.context.globalState.update("extractedYamlKey", extractedKey);
        await this.context.globalState.update("capturedDocumentUri", document.uri.toString()); // This stores the document uri which will help other function find this doc

        vscode.window.showInformationMessage("Please select a task");

        // for debugging
        // vscode.window.showInformationMessage(`Extracted Key: '${extractedKey}' and document URI stored in global state`); 
    }
}