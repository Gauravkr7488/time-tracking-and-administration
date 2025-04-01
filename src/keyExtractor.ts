import * as vscode from 'vscode';

// Function to extract the YAML key under the cursor
export function extractYamlKey(editor: vscode.TextEditor): string | null {
    const document = editor.document;
    const cursorPosition = editor.selection.active;
    const wordRange = document.getWordRangeAtPosition(cursorPosition);
    
    if (!wordRange) {
        vscode.window.showErrorMessage("No word found at cursor position. Place cursor on a YAML key.");
        return null;
    }

    // Get the word and remove any trailing colon
    return document.getText(wordRange).replace(/:$/, '');
}