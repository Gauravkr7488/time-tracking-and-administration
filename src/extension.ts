import * as vscode from 'vscode';
import { YamlModifier } from './ymlModifier';
import { SimpleStringTools } from './SimpleStringTools';
import { YamlKeyExtractor } from './ymlReferenceExtractor';
import { Timer } from './timer';

export function activate(context: vscode.ExtensionContext) {
    const timer = new Timer(context);
    const utils = new SimpleStringTools(context);
    const extractor = new YamlKeyExtractor();


    // Store yamlModifier to make it accessible across commands
    let yamlModifier: YamlModifier | undefined;

    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.specifyStandupReport', async () => {

        await utils.extractYamlKey(); // Extracts the SR Id
        vscode.window.showInformationMessage("Please select a task");
        
    });

    const disposableB = vscode.commands.registerCommand('time-tracking-and-administration.taskSelection', async () => {

        const selectedTaskIsAYamlLink = await utils.isThisALink();
        let yamlLink: string;

        if (selectedTaskIsAYamlLink) {

            yamlLink = context.globalState.get('detectedYamlLink') as string || '';
            if (!yamlLink) return;

        } else {

            await extractor.extractYamlKey(); // Creates the ymlLink
            yamlLink = extractor.createYmlReference();

        }

        const srCode = context.globalState.get("extractedYamlKey") as string; // This is the saved srcode
        if (!srCode) {
            vscode.window.showErrorMessage("Run 'Specify Standup Report' first.");
            return;
        }
        timer.startTimer();
        yamlModifier = new YamlModifier(srCode, yamlLink, context);
        await yamlModifier.modify(); // Modifies the doc
        const startTimeISO = context.globalState.get('timerStartTimeISO') as string;

        await yamlModifier.addTimerString(`[ 0m, "", ${startTimeISO} ]`);
        // await yamlModifier.addTimerString(timer.startTimer()); // Adds start time to YAML
    });

    const disposableC = vscode.commands.registerCommand('time-tracking-and-administration.startTimer', () => {
        const result = timer.startTimer();
        vscode.window.showInformationMessage(result); // Show start time or error
        return result;
    });

    const disposableD = vscode.commands.registerCommand('time-tracking-and-administration.pauseResumeTimer', async () => {
        timer.pauseResumeTimer(); // Currently returns void
    });

    const disposableE = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', async () => {
        if (!yamlModifier) {
            vscode.window.showInformationMessage("Run 'Task Selection' first to initialize the YAML modifier.");
            timer.stopTimer();
            return;
        }
        timer.stopTimer();
        const startTimeISO = context.globalState.get('timerStartTimeISO') as string;
        const durationMinutes = context.globalState.get('timerDurationMinutes') as string;

        await yamlModifier.addTimerString(`[ ${durationMinutes}m, "", ${startTimeISO} ]`);
        // Adds stop time (e.g., "[10.50m]") to YAML
    });

    context.subscriptions.push(disposableA, disposableB, disposableC, disposableD, disposableE);
}

export function deactivate() { }