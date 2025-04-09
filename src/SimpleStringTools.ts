import * as vscode from 'vscode';

export class SimpleStringTools {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private getActiveEditor(): vscode.TextEditor | undefined{
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor.");
            return;
        }
        return editor;
    }

    public async extractYamlKey(): Promise<void> {
        const editor = this.getActiveEditor();
        if (!editor) return;

        const document = editor.document;
        const cursorPosition = editor.selection.active;
        const wordRange = document.getWordRangeAtPosition(cursorPosition);
        
        if (!wordRange) {
            vscode.window.showErrorMessage("No word found at cursor position. Place cursor on a YAML key.");
            return;
        }

        const extractedKey = document.getText(wordRange).replace(/:$/, ''); 


        await this.context.globalState.update("extractedYamlKey", extractedKey);
        await this.context.globalState.update("capturedDocumentUri", document.uri.toString()); 
 
    }

    public async isThisALink(): Promise<boolean> {
        const editor = this.getActiveEditor();
        if (!editor) return false;

        const document = editor.document;
        const position = editor.selection.active;

        const line = document.lineAt(position.line);
        const lineText = line.text;
 
        const linkPattern = /-->.*<\:/g;
        let match;

        while ((match = linkPattern.exec(lineText)) !== null) {
            const startChar = match.index;
            const endChar = startChar + match[0].length;


            if (position.character >= startChar && position.character <= endChar) {
                this.context.globalState.update('detectedYamlLink', match[0]);
                return true;
            }
        }

        vscode.window.showInformationMessage('No link found containing the cursor.');
        return false;
    }
}