import * as vscode from 'vscode';
import { YamlModifier } from './ymlModifier';
import { SimpleStringTools } from './SimpleStringTools';
import { YamlKeyExtractor } from './ymlReferenceExtractor';
import { Timer } from './timer';

import { TaskCommands } from './TaskOperations';

export function activate(context: vscode.ExtensionContext) {
    const taskCommand = new TaskCommands();

    const timer = new Timer(context);
    const utils = new SimpleStringTools(context);
    const extractor = new YamlKeyExtractor();

    let yamlModifier: YamlModifier | undefined;

    const disposableA = vscode.commands.registerCommand('time-tracking-and-administration.specifyStandupReport', async () => {

        // await utils.extractYamlKey(); // Extracts the SR Id
        // vscode.window.showInformationMessage("Please select a task");

        taskCommand.specifyStandupReport();
    });

    const disposableB = vscode.commands.registerCommand('time-tracking-and-administration.taskSelection', async () => {

        let refLink = await extractor.createYamlLink(); // Creates a yml link to check if it contains the srcode to dtect if it is in the sr

        let yamlLink = await utils.isSelectedTaskALink();

        if (!yamlLink) yamlLink = await extractor.createYamlLink();

        const srCode = context.globalState.get("extractedYamlKey") as string;
        if (!srCode) {
            vscode.window.showErrorMessage("Run 'Specify Standup Report' first.");
            return;
        }
        timer.startTimer();
        yamlModifier = new YamlModifier(srCode, yamlLink, context);
        if (refLink.includes(srCode)) {
            await context.globalState.update('refLinkContainsSrCode', true);
        } else {
            const startTimeISO = context.globalState.get('timerStartTimeISO') as string;
            const timeLogString = `[ 0m, "", ${startTimeISO} ]`;
            await yamlModifier.insertNewTask(timeLogString);
            await context.globalState.update('refLinkContainsSrCode', false);
        }

    });

    const disposableC = vscode.commands.registerCommand('time-tracking-and-administration.startTimer', () => {
        const result = timer.startTimer();
        vscode.window.showInformationMessage(result); // Show start time or error
        return result;
    });

    const disposableD = vscode.commands.registerCommand('time-tracking-and-administration.pauseResumeTimer', async () => {
        timer.pauseResumeTimer();

    });

    const disposableE = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', async () => {
        if (!yamlModifier) {
            vscode.window.showInformationMessage("Run 'Task Selection' first to initialize the YAML modifier.");
            timer.stopTimer();
            return;
        }
        timer.stopTimer();
        const startTimeISO = context.globalState.get('timerStartTimeISO') as string;
        const durationMinutes = context.globalState.get('timerDurationMinutes') as number;
        const timeLogString = `[ ${durationMinutes}m, "", ${startTimeISO} ]`;

        const refLink = context.globalState.get("refLinkContainsSrCode");
        if (refLink){
            // a method to add duration to old time log needs to be added here
        }else{
            await yamlModifier.addTimerString(timeLogString);
        }
    });

    context.subscriptions.push(disposableA, disposableB, disposableC, disposableD, disposableE);
}

export function deactivate() { }