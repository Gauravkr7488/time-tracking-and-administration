import * as vscode from 'vscode';
import { modifyYaml } from './hi';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('time-tracking-and-administration.insertHi', async () => {
        modifyYaml();
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
