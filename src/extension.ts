import * as vscode from 'vscode';
import { LinkCommands, TaskCommands } from './TaskOperations';
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

    const disposableForF2yamlSummaryLinkExtractor = vscode.commands.registerCommand('f2tools.extractF2YamlSummaryLink', async () => {
        await LinkCommands.extractF2YamlSummaryLink();
    });
   
    const disposableForF2yamlIdLinkExtractor = vscode.commands.registerCommand('f2tools.extractF2YamlIdLink', async () => {
        await LinkCommands.extractF2YamlIdLink();
    });

    const disposableForF2yamlReferenceGenerator = vscode.commands.registerCommand('f2tools.generateF2yamlReference', async () => {
        // await LinkCommands.generateOrCopyF2yamlReference();
    });

    const disposableForF2yamlLinkFollower = vscode.commands.registerCommand('f2tools.followF2yamlLink', async () => {
        await LinkCommands.followF2yamlLink();
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
        disposableForF2yamlSummaryLinkExtractor, 
        disposableForF2yamlIdLinkExtractor,
        disposableForF2yamlReferenceGenerator,
        disposableForF2yamlLinkFollower,
        disposableForCSVGeneration
    );
}

export function deactivate() { }
