import { YamlEditors } from "./ymlModifier";
import * as vscode from 'vscode';

export class LinkFollower {

    async followLink(yamlLink: string) {
        const summaryWithSpaces = await this.giveExactSummaryWithSpaces(yamlLink);
        const taskDoc = await vscode.workspace.openTextDocument(YamlEditors.taskFileUri);
        if (!summaryWithSpaces) return;
        const taskSummaryRegex = new RegExp(summaryWithSpaces, "i")
        await this.findTheTask(taskSummaryRegex, taskDoc);

    }

    async findTheTask(taskSummaryRegex: RegExp, taskDoc: vscode.TextDocument) {
        const text = taskDoc.getText();
        const match = taskSummaryRegex.exec(text);

        if (!match || match.index === undefined) {
            vscode.window.showInformationMessage("Task not found.");
            return;
        }

        const startPos = taskDoc.positionAt(match.index);
        const endPos = taskDoc.positionAt(match.index + match[0].length);
        const range = new vscode.Range(startPos, endPos);

        const editor = await vscode.window.showTextDocument(taskDoc, { preview: false });
        editor.selection = new vscode.Selection(startPos, endPos);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }


    async giveExactSummaryWithSpaces(yamlLink: string) {
        const result = await YamlEditors.getTaskObjAndItsParent(yamlLink)
        if (!result) return;
        let { taskObj } = result;
        const exactSummary = taskObj.key.value;
        const yamlKeys = YamlEditors.getCleanYamlKeys(yamlLink);
        let spaces: string = "";
        for (let index = 1; index < yamlKeys.length; index++) {
            spaces += "  ";
        }
        const summaryWithSpaces = spaces + exactSummary;
        return summaryWithSpaces;
    }



}