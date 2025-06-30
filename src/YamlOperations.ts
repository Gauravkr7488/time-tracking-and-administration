import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { Message } from './VsCodeUtils';
import { Data } from './Data';

export class YamlTaskOperations {
    public static taskFileUri: vscode.Uri;
    private static taskYamlDoc: yaml.Document<yaml.Node, true>
    static taskYamlLink: string;


    public static async parseYaml(docUri: vscode.Uri) {
        let doc;
        try {
            doc = await vscode.workspace.openTextDocument(docUri);
        } catch (error) {
            Message.err(Data.MESSAGES.ERRORS.UNABLE_TO_FIND_FILE(docUri));
        }
        if (!doc) return;
        const text = doc.getText();
        try {
            const yamlDoc: yaml.Document = yaml.parseDocument(text);
            if (yamlDoc.errors.length > 0) {
                let error = yamlDoc.errors[0];
                Message.err(Data.MESSAGES.ERRORS.PARSING_ERROR(error.message));
                return;
            }
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
        if (!yamlDoc) return false;
        let srEntryObj = await this.findSrEntry(srEntry, yamlDoc, srCode);
        await this.updateDuration(srEntryObj, duration, yamlDoc, srCode);
        const doc = await vscode.workspace.openTextDocument(srDocUri);
        this.applyEditToDoc(yamlDoc, doc);
        return true;
    }

    private static createWorkLog(startTime: string) {
        const workLogSeq = new yaml.YAMLSeq();
        workLogSeq.items = ["0m", "", startTime]
        workLogSeq.flow = true;
        return workLogSeq;
    }

    public static createSrEntry(yamlLink: string, startTime: string) {
        const workLog = YamlTaskOperations.createWorkLog(startTime);
        const srEntryMap = new yaml.YAMLMap();
        srEntryMap.set(yamlLink, workLog);
        return srEntryMap;
    }

    public static async getTaskObj(yamlLink: string) {
        const cleanYamlKeys = YamlTaskOperations.getCleanYamlKeys(yamlLink);
        if (!cleanYamlKeys) return;
        const taskFileUri = await this.createFileURI(cleanYamlKeys);
        if (!taskFileUri) return;
        const taskYamlDoc = await this.parseYaml(taskFileUri);
        if (!taskYamlDoc) return;
        let result = await this.findTaskObjAndItsParent(cleanYamlKeys, taskYamlDoc);
        if (!result) return;
        let { taskObj, parentOfTaskObj } = result;
        if (!taskObj.value.items) {
            taskObj = await this.replaceScalarTaskObjToMap(parentOfTaskObj, taskObj);
        }
        this.taskYamlDoc = taskYamlDoc;
        this.taskFileUri = taskFileUri;

        return taskObj;
    }

    public static getCleanYamlKeys(yamlLink: string) {
        const cleanF2YamlLink = this.removeLinkSymbolsFromLink(yamlLink);
        if (!cleanF2YamlLink) return;
        const yamlKeys = this.parseF2YamlLink(cleanF2YamlLink);
        const cleanYamlKeys = this.removeEmptyKeys(yamlKeys);
        return cleanYamlKeys;
    }

    private static async replaceScalarTaskObjToMap(parentOfTaskObj: any, taskObj: any) {
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

    private static async findTaskObjAndItsParent(cleanYamlKeys: string[], yamlDoc: yaml.Document) {
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
        let taskNameIndex = cleanYamlKeys.length - 1;
        let taskName = cleanYamlKeys[taskNameIndex];
        if (!taskObj || !parentOfTaskObj) {
            Message.err(Data.MESSAGES.ERRORS.UNABLE_TO_FIND_TASK(taskName));
            return;
        }
        return { taskObj, parentOfTaskObj };
    }

    private static moveDeeperIntoTree(parentObj: any, item: any) {
        parentObj = item.value;
        return parentObj;
    }

    private static async createFileURI(cleanYamlKeys: any[]) {
        const fileAndFolderName = cleanYamlKeys[0];
        const arrFileAndFolderName = fileAndFolderName.split(Data.MISC.FILE_DIVIDER);
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
        } catch (err1: any) {
            try {
                let relativePathOfFile = relativePath + ".yaml";
                if (!vscode.workspace.workspaceFolders) return;
                fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
                await vscode.workspace.fs.stat(fileUri);

            } catch (err2: any) {
                Message.err(Data.MESSAGES.ERRORS.UNABLE_TO_FIND_FILE(fileUri));
                return;
            }
        };
        return fileUri;
    }

    private static removeEmptyKeys(yamlKeys: string[]) {
        return yamlKeys.filter(str => str.trim() !== "");
    }

    private static parseF2YamlLink(cleanYamlLink: string) {
        const yamlKeys = cleanYamlLink.split(".");
        let inDoubleQuotes = false;
        let newKeys = [];
        let buff = "";
        for (let index = 0; index < yamlKeys.length; index++) {
            if (yamlKeys[index] == "") {
                yamlKeys[index + 1] = "." + yamlKeys[index + 1];
            }

        }
        for (let index = 0; index < yamlKeys.length; index++) {
            let element = yamlKeys[index];

            if (element.includes("\"")) {
                if (inDoubleQuotes == true) {
                    inDoubleQuotes = false
                    buff += element;
                    newKeys.push(buff);

                } else {
                    inDoubleQuotes = true
                }
            }

            if (inDoubleQuotes == true) {
                buff += element;
            } else {
                if (!element.includes("\"")) {

                    newKeys.push(element);
                }
            }
        }


        for (let index = 0; index < newKeys.length; index++) {
            const element: string = newKeys[index];
            if(element.includes("-->")){
                newKeys[index] = this.replaceSubLink(element, cleanYamlLink)
            }
        }
        return newKeys;
    }

    static replaceSubLink(element: any, cleanYamlLink: string): any {
        let cleanSubLink = YamlTaskOperations.getSubLink(cleanYamlLink);
        
        const [firstPart, rest] = element.split("-->");
        const [linkPart, end] = rest.split("<");

        let newLink = firstPart + "-->" + cleanSubLink + "<" + end;

        return newLink;
    }

    private static getSubLink(cleanYamlLink: string) {
        let linkParts = cleanYamlLink.split("-->");
        let linkPartWithEndingChar = linkParts[1];
        linkParts = linkPartWithEndingChar.split("<");
        let cleanSubLink = linkParts[0];
        return cleanSubLink;
    }

    private static removeLinkSymbolsFromLink(yamlLink: string) {
        const lengthOfFrontLinkSymbols = 3;
        const lengthOfBackLinkSymbols = 1;
        const cleanYamlLink = yamlLink.slice(lengthOfFrontLinkSymbols, -lengthOfBackLinkSymbols);
        return cleanYamlLink;
    }

    public static async cleanStatusCodesFromKeys(key: string) {
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
        const taskObj = await this.getTaskObj(yamlLink);
        if (!taskObj) return;
        const workLogObj = await this.getWorkLogObj(taskObj);
        if (!workLogObj) return;
        let name = this.getName();
        name = new yaml.Scalar(name);
        workLog.items.unshift(name);

        // let isThisDuplicateWorkLog: boolean;

        let isThisDuplicateWorkLog = YamlTaskOperations.checkDuplicateWorklog(workLogObj, workLog);
        if (isThisDuplicateWorkLog == false) {

            await this.insertEntryInNode(workLogObj, workLog);
            return true;
        }
        return false;
    }

    private static checkDuplicateWorklog(workLogObj: any, workLog: any) {
        for (let index = 0; index < workLogObj.items.length; index++) {
            const element = workLogObj.items[index];
            let taskObjWorkLogDate;
            let taskObjWorkLogName;
            try {
                taskObjWorkLogDate = element.items[3].value
                taskObjWorkLogName = element.items[0].value
            } catch (error) {
                return false
            }
            let srObjWorkLogDate = workLog.items[3].value
            let srObjWorkLogName = workLog.items[0].value
            // if (!taskObjWorkLogDate) return false;
            if (taskObjWorkLogDate == srObjWorkLogDate && taskObjWorkLogName == srObjWorkLogName) {
                return true;
            }
        }
        return false;
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
        let checkDocStructure = await YamlTaskOperations.parseYaml(this.taskFileUri);
        if (!checkDocStructure) return;
        let workLogAddedToTask;
        for (let index = 0; index < wasNode.items.length; index++) {
            const currentYamlLink = wasNode.items[index].items[0].key.value;
            const workLog = wasNode.items[index].items[0].value;
            workLogAddedToTask = await this.addWorkLogInTask(workLog, currentYamlLink);
            if (workLogAddedToTask == undefined) return;
            const taskDoc = await vscode.workspace.openTextDocument(this.taskFileUri);
            if (!this.taskYamlDoc) return;
            await this.applyEditToDoc(this.taskYamlDoc, taskDoc);
        }
        return workLogAddedToTask;
    }


    static async isThisTask(yamlLink: string) {
        const cleanYamlLink = this.removeSeqNumberFromYamlLink(yamlLink);
        if (!cleanYamlLink) return;
        const taskObj = await this.getTaskObj(cleanYamlLink);
        if (!taskObj) return;
        const taskKey = taskObj.key.value;
        const taskKeyForSingleLineTask = taskObj.key;
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const arrayOfStatusCodes: string[] = config.get<string[]>('ignoreWords', []);
        for (let index = 0; index < arrayOfStatusCodes.length; index++) {
            const element = arrayOfStatusCodes[index];
            const statusCode = new RegExp(element, "i");
            const match1 = statusCode.exec(taskKey);
            const match2 = statusCode.exec(taskKeyForSingleLineTask);
            if (match1 || match2) return true;
        }
        return false;
    }

    static removeLastKeyOfYamlLink(cleanYamlLink: string) {
        const arrayOfYamlKeys = this.getCleanYamlKeys(cleanYamlLink);
        if (!arrayOfYamlKeys) return;
        for (let index = 0; index < arrayOfYamlKeys.length; index++) {
            if (index == arrayOfYamlKeys.length - 1) {
                arrayOfYamlKeys.pop();
            }
        }
        const jointYamlKeys = arrayOfYamlKeys.join(".");
        const newYamlLink = `-->${jointYamlKeys}<`;
        return newYamlLink;
    }


    static removeSeqNumberFromYamlLink(yamlLink: string) {
        const arrayOfYamlKeys = this.getCleanYamlKeys(yamlLink);
        if (!arrayOfYamlKeys) return;
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

    static async getTaskYamlLink(yamlLink: string): Promise<string | undefined> {
        let newYamlLink = this.removeLastKeyOfYamlLink(yamlLink);
        if (!newYamlLink) return;
        const isThisTask = await this.isThisTask(newYamlLink);
        if (!isThisTask) newYamlLink = await this.getTaskYamlLink(newYamlLink);
        return newYamlLink;
    }

    protected static async getStatusCode(key: string) {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const ignoredWords: string[] = config.get<string[]>('ignoreWords', []);
        for (let index = 0; index < ignoredWords.length; index++) {
            if (key.startsWith(ignoredWords[index])) {
                return ignoredWords[index];
            }
        }
        return;
    }

    static async getIdValues(yamlKeys: string[], yamlDoc: yaml.Document) {
        let idValues = []
        const fileAndFolderName = yamlKeys[0];
        const topLevelObj: any = yamlDoc.get(fileAndFolderName);
        let parentObj = topLevelObj;
        let idObj;
        let idValue;

        for (let index = 1; index < yamlKeys.length; index++) {
            let currentYamlKey = yamlKeys[index];
            for (const item of parentObj.items) {
                if (currentYamlKey == item.key.value) {
                    try {
                        for (const i of item.value.items) {
                            if (i.key.value == "Id") {
                                idObj = i;
                                idValue = idObj.value.value;
                            }
                        }
                    } catch (error) {
                        Message.err(error);
                    }
                    currentYamlKey = await this.cleanStatusCodesFromKeys(currentYamlKey);
                    if (!idValue) {
                        if (/^\S+$/.test(currentYamlKey)) {
                            idValue = currentYamlKey;
                        } else {
                            idValue = `"${currentYamlKey}"`;
                        }
                    }
                    idValues.push(idValue);
                    idValue = null;

                    parentObj = item.value;
                    break;
                }
            }

        }
        return idValues;
    }
}