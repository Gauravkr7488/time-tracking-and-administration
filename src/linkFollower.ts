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
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }


    async giveExactSummaryWithSpaces(yamlLink: string) {
        const taskObj = await YamlEditors.getTaskObjAndItsParent(yamlLink)
        if (!taskObj) return;
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