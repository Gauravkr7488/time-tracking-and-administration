import * as vscode from 'vscode';
import { modifyYaml } from './hi';
import { extractYamlKey } from './keyExtractor';
import { YamlKeyExtractor } from './ymlReferenceExtractor';
import { Timer } from './timer'; // Adjust the path as needed

export function activate(context: vscode.ExtensionContext) {
    // Create a single Timer instance
    const timer = new Timer(context);

    // Existing insertHi command
    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.insertHi', async () => {
        await extractYamlKey(context); // Ensure extraction completes before proceeding
        const extractedKey = context.globalState.get("extractedYamlKey"); // Retrieve stored value
        // vscode.window.showInformationMessage(`Extracted Key: '${extractedKey}'`);
    });
    
    // Existing insertHi2 command
    const disposableB = vscode.commands.registerCommand('time-tracking-and-administration.insertHi2', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor.");
            return;
        }
        const document = editor.document;
        const position = editor.selection.active;
        const extractor = new YamlKeyExtractor(document, position);
        await extractor.extractYamlKey();
        let fullPath = extractor.fullPath();
        if (!fullPath) {
            vscode.window.showErrorMessage("No full path extracted.");
            return;
        }
        vscode.window.showInformationMessage(`'${fullPath}' copied to your clipboard`);
        let formattedText = `-->${fullPath}<:`;
        const extractedKey = context.globalState.get("extractedYamlKey") as string;  // Retrieve stored value
        if (!extractedKey) {
            vscode.window.showErrorMessage("No extracted key stored. Run 'insertHi' first.");
            return;
        }
        
        // Pass context and await the async function
        await modifyYaml(extractedKey, formattedText, context);
    });

    // New startTimer command
    const disposableC = vscode.commands.registerCommand('time-tracking-and-administration.startTimer', () => {
        timer.startTimer();
    });

    // New pauseTimer command
    const disposableD = vscode.commands.registerCommand('time-tracking-and-administration.pauseTimer', () => {
        timer.pauseTimer();
    });

    // New stopTimer command
    const disposableE = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', () => {
        timer.stopTimer();
    });

    // Register all commands
    context.subscriptions.push(disposableA, disposableB, disposableC, disposableD, disposableE);
}

export function deactivate() {}