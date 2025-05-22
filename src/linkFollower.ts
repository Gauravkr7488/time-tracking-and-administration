import { YamlEditors } from "./ymlModifier";
import * as vscode from 'vscode';

export class LinkFollower { // TODO: refactor

    async followLink(yamlLink: string) {
        const summaryWithSpaces = await this.giveExactSummaryWithSpaces(yamlLink);
        const taskDoc = await vscode.workspace.openTextDocument(YamlEditors.taskFileUri);
        if (!summaryWithSpaces) return;
        const taskSummaryRegex = new RegExp("^" + summaryWithSpaces, "im")
        await this.findTheTask(taskSummaryRegex, taskDoc);

    }

    async findTheTask(taskSummaryRegex: RegExp, taskDoc: vscode.TextDocument) {
        const text = taskDoc.getText();
        const match = taskSummaryRegex.exec(text);

        if (!match || match.index === undefined) {
            vscode.window.showInformationMessage("Could not find the item where the link is pointing");
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
        const taskObj = await YamlEditors.getTaskObj(yamlLink)
        if (!taskObj) return;
        let exactSummary = taskObj.key.value;
        if(!exactSummary) exactSummary = taskObj.key;
        const yamlKeys = YamlEditors.getCleanYamlKeys(yamlLink);
        if (!yamlKeys) return;
        let spaces: string = "";
        for (let index = 1; index < yamlKeys.length; index++) {
            spaces += "  ";
        }
        const summaryWithSpaces = spaces + exactSummary;
        return summaryWithSpaces;
    }



}