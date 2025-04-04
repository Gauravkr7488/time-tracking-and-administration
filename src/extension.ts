import * as vscode from 'vscode';
import { modifyYaml } from './hi';
import { Utils } from './utils'; 
import { YamlKeyExtractor } from './ymlReferenceExtractor';
import { Timer } from './timer';

export function activate(context: vscode.ExtensionContext) {
    const timer = new Timer(context);
    const utils = new Utils(context); 
    const extractor = new YamlKeyExtractor(); // no context needed here for now as no global state was used

    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.specifyStandupReport', async () => {
        await utils.extractYamlKey(); // This will extracts the SR Id
        vscode.window.showInformationMessage("Please select a task");

    });
    
    const disposableB = vscode.commands.registerCommand('time-tracking-and-administration.taskSelection', async () => {
        await extractor.extractYamlKey();

        let formattedText = extractor.createYmlReference();

        const extractedKey = context.globalState.get("extractedYamlKey") as string;
        if (!extractedKey) {
            vscode.window.showErrorMessage("No extracted key stored. Run 'Specify Standup Report' first.");
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