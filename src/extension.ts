import * as vscode from 'vscode';
import { TaskCommands } from './TaskOperations';

export function activate(context: vscode.ExtensionContext) {
    const taskCommand = new TaskCommands(context);

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

    context.subscriptions.push(disposableForSr, disposableForTaskSelection, disposableForPauseResumeTimer, disposableForStopTimer);
}

export function deactivate() { }
