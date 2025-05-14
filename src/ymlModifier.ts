import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { ActiveDocAndEditor } from './VsCodeUtils';
import { Message } from './VsCodeUtils';
import { Data } from './Data';

export class YamlEditors {
    public static taskFileUri: vscode.Uri;
    private static taskYamlDoc: yaml.Document<yaml.Node, true>
    static taskYamlLink: string;


    private static async parseYaml(docUri: vscode.Uri) {
        const doc = await vscode.workspace.openTextDocument(docUri);
        if (!doc) return;
        if (!ActiveDocAndEditor.isThisYamlDoc()) return;
        const text = doc.getText();
        try {
            const yamlDoc: yaml.Document = yaml.parseDocument(text);
            return yamlDoc;
        } catch (error) {
            Message.err(Data.MESSAGES.ERRORS.FAILED_TO_PARSE_YAML);
            return;
        }
    }

    private static async getSrObj(yamlDoc: yaml.Document, srCode: string) {
        const srNode = yamlDoc.get(srCode);
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            let srNode = this.createSRObj(yamlDoc, srCode);
            return srNode;
        }
        return srNode;
    }

    private static createSRObj(yamlDoc: yaml.Document, srCode: string) {
        const srCodeObj = new yaml.Scalar(srCode);
        yamlDoc.delete(srCode);
        let srNode = this.createSrNode();
        yamlDoc.set(srCodeObj, srNode);
        return srNode;
    }

    private static createSrNode(): yaml.YAMLMap<unknown, unknown> {
        const srMap = new yaml.YAMLMap();
        const wasObj = this.createObjWithEmptySeq("Was");
        const nextObj = this.createObjWithEmptySeq("Next");
        srMap.add(wasObj);
        srMap.add(nextObj);
        return srMap;
    }

    private static createObjWithEmptySeq(key: string) {
        const node = new yaml.YAMLSeq();
        const emptyItem = new yaml.Scalar(null);
        node.items.push(emptyItem);
        const wasObj = new yaml.Pair(
            new yaml.Scalar(key),
            node
        );
        return wasObj;
    }

    private static async getWasObj(yamlDoc: yaml.Document, srCode: string) {
        let srNode = await this.getSrObj(yamlDoc, srCode);
        if (!srNode) return;
        let wasNode = srNode.get("Was");
        if (!wasNode) wasNode = srNode.get("was");
        if (!wasNode || !(wasNode instanceof yaml.YAMLSeq)) {
            srNode = this.createSRObj(yamlDoc, srCode);
            if (!srNode) return;
            wasNode = srNode.get("Was");
        }
        return wasNode;
    }

    private static async insertEntryInNode(node: yaml.YAMLSeq, entry: any) {
        const emptyItemIndex = node.items.findIndex(item =>
            item === null ||
            (item instanceof yaml.Scalar && (item.value === '' || item.value === null)) ||
            (item instanceof yaml.YAMLMap && item.items.length === 0) ||
            (item instanceof yaml.YAMLSeq && item.items.length === 0)

        );

        if (emptyItemIndex !== -1) {
            node.items[emptyItemIndex] = entry;
        } else {
            node.add(entry);
        }
    }

    private static async applyEditToDoc(yamlDoc: yaml.Document, doc: vscode.TextDocument) {
        const edit = new vscode.WorkspaceEdit();
        let updatedYaml = yamlDoc.toString({
            defaultStringType: 'PLAIN',
            simpleKeys: true,
            lineWidth: 0 // Prevent wrapping
        });

        const fullRange = new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(doc.getText().length)
        );
        edit.replace(doc.uri, fullRange, updatedYaml);

        await vscode.workspace.applyEdit(edit);
    }

    public static async moveEntryToWasInSr(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri) {
        const yamlDoc = await this.parseYaml(srDocUri);
        if (!yamlDoc) return;
        const wasNode = await this.getWasObj(yamlDoc, srCode);
        if (!wasNode) return;

        await this.insertEntryInNode(wasNode, srEntry);
        const doc = await vscode.workspace.openTextDocument(srDocUri)
        this.applyEditToDoc(yamlDoc, doc);
    }

    private static async findSrEntry(srEntry: yaml.YAMLMap<unknown, unknown>, yamlDoc: yaml.Document, srCode: string) {
        const wasNode = await this.getWasObj(yamlDoc, srCode);
        for (let i = wasNode.items.length - 1; i >= 0; i--) {
            const item = wasNode.items[i];
            if (item.items?.[0]?.key?.value === srEntry.items[0].key) {
                return i; // Return the index of the last matching item
            }
        }

        return -1;
    }

    private static async updateDuration(srEntryIndex: any, duration: number, yamlDoc: yaml.Document, srCode: string) {
        const wasNode = await this.getWasObj(yamlDoc, srCode);
        const srEntryObj = wasNode.items[srEntryIndex];
        let oldDurationWithM = srEntryObj.items[0].value.items[0].value;
        let oldDuation = oldDurationWithM.replace("m", "");
        oldDuation = Number(oldDuation);
        let timeElapsed = duration;
        const newDuration = oldDuation + timeElapsed;
        srEntryObj.items[0].value.items[0].value = `${newDuration}m`;
        wasNode.items[srEntryIndex] = srEntryObj;
        const updatedWorkLog = srEntryObj.items[0].value;
        return updatedWorkLog
    }

    public static async updateSrEntryDuration(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri, duration: number) {
        const yamlDoc = await this.parseYaml(srDocUri);
        if (!yamlDoc) return;
        let srEntryObj = await this.findSrEntry(srEntry, yamlDoc, srCode);
        await this.updateDuration(srEntryObj, duration, yamlDoc, srCode);
        const doc = await vscode.workspace.openTextDocument(srDocUri);
        this.applyEditToDoc(yamlDoc, doc);
    }

    private static createWorkLog(startTime: string) {
        const workLogSeq = new yaml.YAMLSeq();
        workLogSeq.items = ["0m", "", startTime]
        workLogSeq.flow = true;
        return workLogSeq;
    }

    public static createSrEntry(yamlLink: string, startTime: string) {
        const workLog = YamlEditors.createWorkLog(startTime);
        const srEntryMap = new yaml.YAMLMap();
        srEntryMap.set(yamlLink, workLog);
        return srEntryMap;
    }

    public static async getTaskObjAndItsParent(yamlLink: string) {
        const cleanYamlKeys = YamlEditors.getCleanYamlKeys(yamlLink);
        const taskFileUri = await this.createFileURI(cleanYamlKeys);
        if (!taskFileUri) return;
        const taskYamlDoc = await this.parseYaml(taskFileUri);
        if (!taskYamlDoc) return;
        let result = await this.findTaskObjAndItsParent(cleanYamlKeys, taskYamlDoc);
        if (!result) return;
        let { taskObj, parentOfTaskObj } = result;
        if (!taskObj.value.items) {
            taskObj = await this.replaceTheTaskObj(parentOfTaskObj, taskObj);
        }
        this.taskYamlDoc = taskYamlDoc;
        this.taskFileUri = taskFileUri;

        return { taskObj, parentOfTaskObj };

    }

    public static getCleanYamlKeys(yamlLink: string) {
        const cleanF2YamlLink = this.removeLinkSymbolsFromLink(yamlLink);
        const yamlKeys = this.parseF2YamlLink(cleanF2YamlLink);
        const cleanYamlKeys = this.removeEmptyKeys(yamlKeys);
        return cleanYamlKeys;
    }

    private static async replaceTheTaskObj(parentOfTaskObj: any, taskObj: any) { // TODO change its name this one is probably making the yamlscalar to yaml map
        for (let index = 0; index < parentOfTaskObj.items.length; index++) {
            let currentObj = parentOfTaskObj.items[index];
            if (currentObj === taskObj) {
                const taskObjName = taskObj.key.value;
                const taskObjItem = this.createWorkLogObj();
                const map = new yaml.YAMLMap();
                map.add(taskObjItem)
                const taskObjMap = new yaml.Pair(taskObjName, map);
                parentOfTaskObj.items[index] = taskObjMap;
                return taskObjMap;
            }
        }
    }

    private static async findTaskObjAndItsParent(cleanYamlKeys: string[], yamlDoc: yaml.Document) { // TODO refactor
        let parentOfTaskObj;
        let taskObj;
        const fileAndFolderName = cleanYamlKeys[0];
        const topLevelObj: any = yamlDoc.get(fileAndFolderName);
        let parentObj = topLevelObj;
        for (let index = 1; index < cleanYamlKeys.length; index++) {
            const currentKey = cleanYamlKeys[index];
            for (const item of parentObj.items) {
                const cleanedKey = await this.cleanStatusCodesFromKeys(item.key.value);
                if (cleanedKey === currentKey) {
                    if (index == cleanYamlKeys.length - 1) {
                        taskObj = item;
                        parentOfTaskObj = parentObj;
                    }
                    parentObj = this.moveDeeperIntoTree(parentObj, item);

                    break;
                }
            }
        }
        return { taskObj, parentOfTaskObj };
    }

    private static moveDeeperIntoTree(parentObj: any, item: any) {
        parentObj = item.value;
        return parentObj;
    }

    private static async createFileURI(cleanYamlKeys: any[]) {
        const fileAndFolderName = cleanYamlKeys[0];
        const arrFileAndFolderName = fileAndFolderName.split("//");
        let relativePath: string = ".";
        let fileUri;
        for (let index = 0; index < arrFileAndFolderName.length; index++) {
            relativePath = relativePath + "/" + arrFileAndFolderName[index];
        }
        try {

            let relativePathOfFile = relativePath + ".yml";
            if (!vscode.workspace.workspaceFolders) return;
            fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
            await vscode.workspace.fs.stat(fileUri);
            // this.docUri = fileUri;
        } catch (err1: any) {
            try {
                let relativePathOfFile = relativePath + ".yaml";
                if (!vscode.workspace.workspaceFolders) return;
                fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
                await vscode.workspace.fs.stat(fileUri);
                // this.docUri = fileUri;

            } catch (err2: any) {
                Message.err(err1 + '' + err2);
            }
        };
        return fileUri;
    }

    private static removeEmptyKeys(yamlKeys: string[]) {
        return yamlKeys.filter(str => str.trim() !== "");
    }

    private static parseF2YamlLink(cleanYamlLink: string) {
        const yamlKeys = cleanYamlLink.split(".");
        for (let index = 0; index < yamlKeys.length; index++) {
            if (yamlKeys[index] == "") {
                yamlKeys[index + 1] = "." + yamlKeys[index + 1];
            }

        }
        return yamlKeys;
    }

    private static removeLinkSymbolsFromLink(yamlLink: string) {
        const lengthOfFrontLinkSymbols = 3;
        const lengthOfBackLinkSymbols = 1;
        const cleanYamlLink = yamlLink.slice(lengthOfFrontLinkSymbols, -lengthOfBackLinkSymbols);
        return cleanYamlLink;
    }

    private static async cleanStatusCodesFromKeys(key: string) {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const ignoredWords: string[] = config.get<string[]>('ignoreWords', []);
        for (let index = 0; index < ignoredWords.length; index++) {
            if (key.startsWith(ignoredWords[index])) {
                let cleanedKey = key.slice(ignoredWords[index].length).trimStart();
                return cleanedKey;
            }
        }
        return key;
    }

    private static createWorkLogObj() {

        const workLogObj = new yaml.Pair(
            new yaml.Scalar('WorkLog'),
            new yaml.YAMLSeq()
        );
        const emptyItem = new yaml.Scalar(null);
        (workLogObj.value as yaml.YAMLSeq).items.push(emptyItem);

        return workLogObj;
    }

    private static addNullValueInWorkLog(workLogObj: any) {
        const newSeq = new yaml.YAMLSeq();
        newSeq.items.push(new yaml.Scalar(null));

        workLogObj.value = newSeq;
    }

    private static async getWorkLogObj(taskObj: any) {
        if (!taskObj.value.items) {
            Message.err(Data.MESSAGES.ERRORS.NOT_A_PROPER_TASK);
            return
        }

        let workLogObj = taskObj.value.items.find((item: any) => item.key.value == "WorkLog");
        if (!workLogObj) {
            workLogObj = this.createWorkLogObj();
            taskObj.value.items.push(workLogObj);
        }
        if (!workLogObj.value.items) this.addNullValueInWorkLog(workLogObj);
        return workLogObj.value;
    }

    private static getName() {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const userName = config.get('userName');
        return userName;
    }

    private static async addWorkLogInTask(workLog: any, yamlLink: string) {
        const result = await this.getTaskObjAndItsParent(yamlLink);
        if (!result) return;
        const { taskObj } = result;
        const workLogObj = await this.getWorkLogObj(taskObj);
        if (!workLogObj) return;
        let name = this.getName();
        name = new yaml.Scalar(name);
        workLog.items.unshift(name);
        await this.insertEntryInNode(workLogObj, workLog);
    }

    public static async checkIfTaskIsAlreadyInSr(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri) {
        const yamlDoc = await this.parseYaml(srDocUri);
        if (!yamlDoc) return;
        const wasNode = await this.getWasObj(yamlDoc, srCode);
        if (!wasNode) return;
        let srIndex = await this.findSrEntry(srEntry, yamlDoc, srCode);
        return srIndex;

    }

    public static async generateWorkLogs(srCode: string, srDocUri: vscode.Uri) {
        const yamlDoc = await this.parseYaml(srDocUri);
        if (!yamlDoc) return;
        const wasNode = await this.getWasObj(yamlDoc, srCode);
        if (!wasNode) return;
        for (let index = 0; index < wasNode.items.length; index++) {
            const currentYamlLink = wasNode.items[index].items[0].key.value;
            const workLog = wasNode.items[index].items[0].value;
            await this.addWorkLogInTask(workLog, currentYamlLink);

            const taskDoc = await vscode.workspace.openTextDocument(this.taskFileUri);
            if (!this.taskYamlDoc) return
            await this.applyEditToDoc(this.taskYamlDoc, taskDoc);
        }
        return;
    }


    static async isThisTask(yamlLink: string) {
        const cleanYamlLink = this.removeSeqNumberFromYamlLink(yamlLink);
        const result = await this.getTaskObjAndItsParent(cleanYamlLink);
        if (!result) return;
        const { taskObj } = result;
        const taskKey = taskObj.key.value;
        const taskKeyForSingleLineTask = taskObj.key
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const arrayOfStatusCodes: string[] = config.get<string[]>('ignoreWords', []);
        for (let index = 0; index < arrayOfStatusCodes.length; index++) {
            const element = arrayOfStatusCodes[index];
            const statusCode = new RegExp(element, "i");
            const match1 = statusCode.exec(taskKey);
            const match2 = statusCode.exec(taskKeyForSingleLineTask);
            if (match1 || match2) return true;

        }
        // let something = await this.removeLastKeyOfYamlLink(cleanYamlLink);
        // if(something == true){
        //     this.taskYamlLink = yamlLink
        //     return true;
        // } 
        return false;
    }

    static removeLastKeyOfYamlLink(cleanYamlLink: string) {
        const arrayOfYamlKeys = this.getCleanYamlKeys(cleanYamlLink);
        for (let index = 0; index < arrayOfYamlKeys.length; index++) {
            if (index == arrayOfYamlKeys.length - 1) {
                arrayOfYamlKeys.pop();
            }
        }
        const jointYamlKeys = arrayOfYamlKeys.join(".");
        const newYamlLink = `-->${jointYamlKeys}<`;
        // let isThisTask = await this.isThisTask(newYamlLink);
        return newYamlLink;
    }


    static removeSeqNumberFromYamlLink(yamlLink: string) {
        const arrayOfYamlKeys = this.getCleanYamlKeys(yamlLink);
        for (let index = 0; index < arrayOfYamlKeys.length; index++) {
            const element = arrayOfYamlKeys[index];
            const match = element.match(/^\d+$/); // match full numeric parts only
            if (match) {
                // Slice up to the numeric part (excluding it), and join with '.'
                const result = arrayOfYamlKeys.slice(0, index).join(".");
                return `-->${result}<`;
            }
        }
        // If no number is found, return the original string
        return yamlLink;
    }

    static async getTaskYamlLink(yamlLink: string) {
        let newYamlLink = this.removeLastKeyOfYamlLink(yamlLink);
        const isThisTask = await this.isThisTask(newYamlLink);
        if (!isThisTask) newYamlLink = await this.getTaskYamlLink(newYamlLink);
        return newYamlLink;
    }

}