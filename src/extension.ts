import * as vscode from 'vscode';
import { LinkCommands, TaskCommands } from './TaskOperations';

export function activate(context: vscode.ExtensionContext) {
    const taskCommand = new TaskCommands(context);
    const linkCommands = new LinkCommands();

    const disposableForSr = vscode.commands.registerCommand('time-tracking-and-administration.specifyStandupReport', async () => {
        taskCommand.specifyStandupReport();
    });

    const disposableForTaskSelection = vscode.commands.registerCommand('time-tracking-and-administration.taskSelection', async () => {
        taskCommand.selectTask();
    });

    const disposableForPauseResumeTimer = vscode.commands.registerCommand('time-tracking-and-administration.pauseResumeTimer', async () => {
        taskCommand.pauseOrResumeTask();
    });

    const disposableForStopTimer = vscode.commands.registerCommand('time-tracking-and-administration.stopTimer', async () => {
        await taskCommand.stopTask();
    });
    
    const disposableForWorkLogGenerator = vscode.commands.registerCommand('time-tracking-and-administration.generateWorkLogs', async () => {
        await taskCommand.generateWorkLogs();
    });

    const disposableForF2yamlReferenceGenerator = vscode.commands.registerCommand('time-tracking-and-administration.generateF2yamlLink', async () => {
        await linkCommands.generateOrCopyF2yamlLink();
    });

    const disposableForF2yamlReferenceGenerator2 = vscode.commands.registerCommand('time-tracking-and-administration.generateF2yamlReference', async () => {
        await linkCommands.generateOrCopyF2yamlReference2();
    });

    
    context.subscriptions.push(disposableForSr, disposableForTaskSelection, disposableForPauseResumeTimer, disposableForStopTimer, disposableForWorkLogGenerator, disposableForF2yamlReferenceGenerator, disposableForF2yamlReferenceGenerator2);
}

export function deactivate() { }
