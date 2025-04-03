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

        // Get the word and remove any trailing colon
        const extractedKey = document.getText(wordRange).replace(/:$/, '');

        // Store the extracted key and document URI in global state
        await this.context.globalState.update("extractedYamlKey", extractedKey);
        await this.context.globalState.update("capturedDocumentUri", document.uri.toString());

        vscode.window.showInformationMessage(`Extracted Key: '${extractedKey}' and document URI stored in global state`);
    }
}