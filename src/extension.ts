import * as vscode from 'vscode';
import { modifyYaml } from './hi';
import { Utils } from './utils'; // Adjust the path as needed
import { YamlKeyExtractor } from './ymlReferenceExtractor';
import { Timer } from './timer';

export function activate(context: vscode.ExtensionContext) {
    const timer = new Timer(context);
    const utils = new Utils(context); // Create Utils instance

    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.insertHi', async () => {
        await utils.extractYamlKey(); // Call method on Utils instance
    });
    
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
        const extractedKey = context.globalState.get("extractedYamlKey") as string;
        if (!extractedKey) {
            vscode.window.showErrorMessage("No extracted key stored. Run 'insertHi' first.");
            return;
        }
        
        await modifyYaml(extractedKey, formattedText, context);
    });

    const disposableC = vscode.commands.registerCommand('time-tracking-and-administration.startTimer', () => {
        timer.startTimer();
    });

    const disposableD = vscode.commands.registerCommand('time-tracking-and-administration.pauseTimer', () => {
        timer.pauseResumeTimer();
    });

    const disposableE = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', () => {
        timer.stopTimer();
    });

    context.subscriptions.push(disposableA, disposableB, disposableC, disposableD, disposableE);
}

export function deactivate() {}