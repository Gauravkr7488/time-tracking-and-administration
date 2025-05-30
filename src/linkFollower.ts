import { Data } from "./Data";
import { SimpleStringTools } from "./SimpleStringTools";
import { Message } from "./VsCodeUtils";
import { YamlTaskOperations } from "./YamlOperations";
import * as vscode from 'vscode';

export class LinkFollower {

    async followLink(yamlLink: string) {
        let summaryWithSpaces = await this.giveExactSummaryWithSpaces(yamlLink);
        if (!summaryWithSpaces) return;
        summaryWithSpaces = SimpleStringTools.escapeSpecialCharacters(summaryWithSpaces);
        const taskDoc = await vscode.workspace.openTextDocument(YamlTaskOperations.taskFileUri);
        const taskSummaryRegex = new RegExp("^" + summaryWithSpaces, "im")
        await this.findTheTask(taskSummaryRegex, taskDoc);

    }

    async findTheTask(taskSummaryRegex: RegExp, taskDoc: vscode.TextDocument) {
        const text = taskDoc.getText();
        const match = taskSummaryRegex.exec(text);

        if (!match || match.index === undefined) {
            Message.err(Data.MESSAGES.ERRORS.LINK_ITEM_NOT_FOUND);
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
        const taskObj = await YamlTaskOperations.getTaskObj(yamlLink)
        if (!taskObj) return;
        let exactSummary = taskObj.key.value;
        if(!exactSummary) exactSummary = taskObj.key;
        const yamlKeys = YamlTaskOperations.getCleanYamlKeys(yamlLink);
        if (!yamlKeys) return;
        let spaces: string = "";
        for (let index = 1; index < yamlKeys.length; index++) {
            spaces += "  ";
        }
        const summaryWithSpaces = spaces + exactSummary;
        return summaryWithSpaces;
    }
}