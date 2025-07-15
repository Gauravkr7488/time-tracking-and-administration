import { Data } from "./Data";
import { SimpleStringTools } from "./SimpleStringTools";
import { StringOperation } from "./StringOperations";
import { Message, VsCodeUtils } from "./VsCodeUtils";
import { YamlTaskOperations } from "./YamlOperations";
import * as vscode from 'vscode';

export class LinkFollower {

    static async followF2yamlLink(yamlLink: string) {
        try {
            const { filePath, yamlPath } = StringOperation.parseF2yamlLink(yamlLink);
            const fileUri: vscode.Uri = await VsCodeUtils.getFileUri(filePath);
            const yamlKeys: string[] = StringOperation.parseYamlPath(yamlPath);
            const yamlObj: any = await YamlTaskOperations.getYamlObj(yamlKeys, fileUri);
            const keyValueOfYamlObj: string = YamlTaskOperations.getYamlKeyValue(yamlObj)
            const keyValueWithSpaces = this.addSpacesInKey(keyValueOfYamlObj, yamlKeys);
            const docOftheLink = await vscode.workspace.openTextDocument(fileUri);
            const cleanKeyValue = StringOperation.escapeSpecialCharacters(keyValueWithSpaces)
            const taskSummaryRegex = new RegExp("^\s*" + cleanKeyValue, "im") // what are those magic strings
            await this.findTheTask(taskSummaryRegex, docOftheLink);
        } catch (error: any) {
            Message.err(error.message);
        }
    }

    static addSpacesInKey(keyValueOfYamlObj: string, yamlKeys: string[]) {
        let keyWithSpaces = '';
        let spaces = '';
        for (let index = 0; index < yamlKeys.length - 1; index++) {
            spaces += "  ";
        }
        keyWithSpaces = spaces + keyValueOfYamlObj;
        return keyWithSpaces;
    }

    async followLink(yamlLink: string) {
        let summaryWithSpaces = await this.giveExactSummaryWithSpaces(yamlLink);
        if (!summaryWithSpaces) return;
        summaryWithSpaces = SimpleStringTools.escapeSpecialCharacters(summaryWithSpaces);
        const taskDoc = await vscode.workspace.openTextDocument(YamlTaskOperations.taskFileUri);
        const taskSummaryRegex = new RegExp("^" + summaryWithSpaces, "im") // what are those magic strings
        await LinkFollower.findTheTask(taskSummaryRegex, taskDoc);

    }

    static async findTheTask(taskSummaryRegex: RegExp, taskDoc: vscode.TextDocument) {
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
        if (!exactSummary) exactSummary = taskObj.key;
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