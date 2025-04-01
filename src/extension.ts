import * as vscode from 'vscode';
import { modifyYaml } from './hi';
import { extractYamlKey } from './keyExtractor';
import { YamlKeyExtractor } from './ymlReferenceExtractor';


export function activate(context: vscode.ExtensionContext) {
    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.insertHi', async () => {
        await extractYamlKey(context); // Ensure extraction completes before proceeding
        const extractedKey = context.globalState.get("extractedYamlKey"); // Retrieve stored value
        // vscode.window.showInformationMessage(`Extracted Key: '${extractedKey}'`);
    });
    
    
    const disposable = vscode.commands.registerCommand('time-tracking-and-administration.insertHi2', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const document = editor.document;
        const position = editor.selection.active;
        const extractor = new YamlKeyExtractor(document, position);
        await extractor.extractYamlKey();
        let fullPath = extractor.fullPath();
        vscode.window.showInformationMessage(`'${fullPath}' copied to your clipboard`);
        let formattedText = `-->${fullPath}<:`;
        const extractedKey = context.globalState.get("extractedYamlKey") as string;  // Retrieve stored value
        
        modifyYaml(extractedKey ,formattedText);
    });
    context.subscriptions.push(disposableA, disposable);
}

export function deactivate() {}
