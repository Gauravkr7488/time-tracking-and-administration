import * as vscode from 'vscode';
import { LinkCommands, TaskCommands } from './TaskOperations';

export function activate(context: vscode.ExtensionContext) {

    const disposableForSr = vscode.commands.registerCommand('time-tracking-and-administration.specifyStandupReport', async () => {
        await TaskCommands.specifyStandupReport();
    });

    const disposableForTaskSelection = vscode.commands.registerCommand('time-tracking-and-administration.taskSelection', async () => {
        await TaskCommands.selectTask();
    });

    const disposableForPauseResumeTimer = vscode.commands.registerCommand('time-tracking-and-administration.pauseResumeTimer', async () => {
        TaskCommands.pauseOrResumeTask();
    });

    const disposableForStopTimer = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', async () => {
        await TaskCommands.stopTask();
    });

    const disposableForWorkLogGenerator = vscode.commands.registerCommand('time-tracking-and-administration.generateWorkLogs', async () => {
        await TaskCommands.generateWorkLogs();
    });

    const disposableForF2yamlLinkGenerator = vscode.commands.registerCommand('time-tracking-and-administration.generateF2yamlLink', async () => {
        await LinkCommands.generateOrCopyF2yamlLink();
    });

    const disposableForF2yamlReferenceGenerator = vscode.commands.registerCommand('time-tracking-and-administration.generateF2yamlReference', async () => {
        await LinkCommands.generateOrCopyF2yamlReference();
    });

    const disposableForLinkFollower = vscode.commands.registerCommand('time-tracking-and-administration.followLink', async () => {
        await LinkCommands.followLink();
    });
    
    const disposableForCSVGeneration = vscode.commands.registerCommand('time-tracking-and-administration.generateCSV', async () => {
        await TaskCommands.generateCSV();
    });

    context.subscriptions.push(
        disposableForSr,
        disposableForTaskSelection, 
        disposableForPauseResumeTimer, 
        disposableForStopTimer, 
        disposableForWorkLogGenerator, 
        disposableForF2yamlLinkGenerator, 
        disposableForF2yamlReferenceGenerator,
        disposableForLinkFollower,
        disposableForCSVGeneration
    );
}

export function deactivate() { }
