import * as vscode from 'vscode';
import { LinkCommands, TaskCommands } from './TaskOperations';
import { IdLinkCreater } from './ymlReferenceExtractor'; // TODO remove this
// remove all dependencies apart from the one you are using rn
export function activate(context: vscode.ExtensionContext) { // TODO remove async if not needed // TODO maybe remove all regex

    const disposableForSr = vscode.commands.registerCommand('f2tools.specifyStandupReport', async () => {
        await TaskCommands.specifyStandupReport();
    });

    const disposableForTaskSelection = vscode.commands.registerCommand('f2tools.taskSelection', async () => {
        await TaskCommands.selectTask();
    });

    const disposableForPauseResumeTimer = vscode.commands.registerCommand('f2tools.pauseResumeTimer', async () => {
        TaskCommands.pauseOrResumeTask();
    });

    const disposableForStopTimer = vscode.commands.registerCommand('f2tools.stopTimer', async () => {
        await TaskCommands.stopTask();
    });

    const disposableForWorkLogGenerator = vscode.commands.registerCommand('f2tools.generateWorkLogs', async () => {
        await TaskCommands.generateWorkLogs();
    });

    const disposableForF2yamlLinkGenerator = vscode.commands.registerCommand('f2tools.generateF2yamlLink', async () => {
        await LinkCommands.generateOrCopyF2yamlLink();
    });

    const disposableForF2yamlReferenceGenerator = vscode.commands.registerCommand('f2tools.generateF2yamlReference', async () => {
        await LinkCommands.generateOrCopyF2yamlReference();
    });

    const disposableForLinkFollower = vscode.commands.registerCommand('f2tools.followLink', async () => {
        await LinkCommands.followLink();
    });
    
    const disposableForCSVGeneration = vscode.commands.registerCommand('f2tools.generateCSV', async () => {
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
