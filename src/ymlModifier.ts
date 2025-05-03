import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { ValidateAndGet } from './Validator';
import { Message } from './VsCodeUtils';

export class YamlEditors {

    private validateAndGet = new ValidateAndGet();
    private yamlDoc?: yaml.Document;
    private message = new Message();
    private doc?: vscode.TextDocument;
    private docUri?: vscode.Uri;
    private srCode?: string;
    private yamlLink: string = '';
    private updatedWorkLog: any;

    private async parseYaml() {
        if (!this.docUri) return;
        this.doc = await vscode.workspace.openTextDocument(this.docUri);
        const doc = this.doc;
        if (!doc) return;
        if (!this.validateAndGet.isThisYamlDoc()) return;
        const text = doc.getText();
        try {
            this.yamlDoc = yaml.parseDocument(text);
            return;
        } catch (error) {
            this.message.err("Failed to parse YAML");
            return;
        }
    }

    private async getSrObj() {
        if (!this.yamlDoc) return;
        if (!this.srCode) return;
        const srNode = this.yamlDoc.get(this.srCode);
        const srCodeObj = new yaml.Scalar(this.srCode);
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            this.yamlDoc.delete(this.srCode);
            let srNode = this.createSrNode();
            this.yamlDoc.set(srCodeObj, srNode);
            return srNode;
        }
        return srNode;
    }

    createSrNode(): yaml.YAMLMap<unknown, unknown> {
        const srMap = new yaml.YAMLMap();
        const wasObj = this.createObjWithEmptySeq("Was");
        const nextObj = this.createObjWithEmptySeq("Next");
        srMap.add(wasObj);
        srMap.add(nextObj);
        return srMap;
    }

    private createObjWithEmptySeq(key: string) {
        const node = new yaml.YAMLSeq();
        const emptyItem = new yaml.Scalar(null);
        node.items.push(emptyItem);
        const wasObj = new yaml.Pair(
            new yaml.Scalar(key),
            node
        );
        return wasObj;
    }

    private async getWasObj() {
        const srNode = await this.getSrObj();
        if (!srNode) return;
        let wasNode = srNode.get("Was");
        if (!wasNode) wasNode = srNode.get("was");
        if (!wasNode || !(wasNode instanceof yaml.YAMLSeq)) {
            this.message.err("no wasSection was found in the Sr");
        }
        return wasNode;
    }


    private insertEntryInNode(node: yaml.YAMLSeq, entry: any) {
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

    private async applyEditToDoc() {
        const edit = new vscode.WorkspaceEdit();
        if (!this.doc) return;
        if (!this.yamlDoc) return;

        let updatedYaml = this.yamlDoc.toString({
            defaultStringType: 'PLAIN',
            simpleKeys: true,
            lineWidth: 0 // Prevent wrapping
        });

        const fullRange = new vscode.Range(
            this.doc.positionAt(0),
            this.doc.positionAt(this.doc.getText().length)
        );
        edit.replace(this.doc.uri, fullRange, updatedYaml);

        await vscode.workspace.applyEdit(edit);
    }

    async moveEntryToWasInSr(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri) {
        this.docUri = srDocUri;
        this.srCode = srCode;
        await this.parseYaml();

        const wasNode = await this.getWasObj();
        if (!wasNode) return;

        this.insertEntryInNode(wasNode, srEntry);
        this.applyEditToDoc();
        // add the entry to the was node
    }

    private async findSrEntry(srEntry: yaml.YAMLMap<unknown, unknown>) {
        const wasNode = await this.getWasObj();
        for (let i = wasNode.items.length - 1; i >= 0; i--) {
            const item = wasNode.items[i];
            if (item.items?.[0]?.key?.value === srEntry.items[0].key) {
                return i; // Return the index of the last matching item
            }
        }

        return -1;
    }

    async updateDuration(srEntryIndex: any, duration: string) {
        const wasNode = await this.getWasObj();
        const srEntryObj = wasNode.items[srEntryIndex];
        let oldDurationWithM = srEntryObj.items[0].value.items[0].value;
        let oldDuation = oldDurationWithM.replace("m", "");
        oldDuation = Number(oldDuation)
        let timeElapsed = Number(duration)
        const newDuration = oldDuation + timeElapsed;
        srEntryObj.items[0].value.items[0].value = `${newDuration}m`;
        wasNode.items[srEntryIndex] = srEntryObj;
        this.updatedWorkLog = srEntryObj.items[0].value;
    }

    async updateSrEntryDuration(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri, duration: any) {
        this.docUri = srDocUri;
        this.srCode = srCode;
        await this.parseYaml();
        let srEntryObj = await this.findSrEntry(srEntry);
        await this.updateDuration(srEntryObj, duration);
        this.applyEditToDoc();
    }


    createWorkLog(startTime: string) {
        const workLogSeq = new yaml.YAMLSeq();
        workLogSeq.items = ["0m", "", startTime]
        workLogSeq.flow = true;
        return workLogSeq;
    }

    createSrEntry(yamlLink: string, startTime: string) {
        const workLog = this.createWorkLog(startTime);
        const srEntryMap = new yaml.YAMLMap();
        this.yamlLink = yamlLink;
        srEntryMap.set(yamlLink, workLog);
        return srEntryMap;
    }

    async getTaskObj() {
        // let taskObj;
        // let parentOftaskObj;
        const cleanF2YamlLink = this.removeLinkSymbolsFromLink();
        const yamlKeys = this.parseF2YamlLink(cleanF2YamlLink);
        const cleanYamlKeys = this.removeEmptyKeys(yamlKeys);
        await this.createFileURIandParseYaml(cleanYamlKeys);
        let result = await this.findTaskObj(cleanYamlKeys);
        if (!result) return;
        let { taskObj, parentOfTaskObj } = result;
        if (!taskObj.value.items) {
            taskObj = this.replaceTheTaskObj(parentOfTaskObj, taskObj);
        }
        return taskObj;

    }

    async replaceTheTaskObj(parentOfTaskObj: any, taskObj: any) {
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

    private async findTaskObj(cleanYamlKeys: string[]) {
        let parentOfTaskObj;
        let taskObj;
        if (!this.yamlDoc) return;
        const fileAndFolderName = cleanYamlKeys[0];
        const topLevelObj: any = this.yamlDoc.get(fileAndFolderName);
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

    private moveDeeperIntoTree(parentObj: any, item: any) {
        parentObj = item.value;
        return parentObj;
    }

    private async createFileURIandParseYaml(cleanYamlKeys: any[]) {
        const fileAndFolderName = cleanYamlKeys[0];
        const arrFileAndFolderName = fileAndFolderName.split("//");
        let relativePath: string = ".";
        for (let index = 0; index < arrFileAndFolderName.length; index++) {
            relativePath = relativePath + "/" + arrFileAndFolderName[index];
        }
        try {

            let relativePathOfFile = relativePath + ".yml";
            if (!vscode.workspace.workspaceFolders) return;
            const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
            this.docUri = fileUri;
            await this.parseYaml();
        } catch (err1: any) {
            try {
                let relativePathOfFile = relativePath + ".yaml";
                if (!vscode.workspace.workspaceFolders) return;
                const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
                this.docUri = fileUri;
                await this.parseYaml();

            } catch (err2: any) {
                this.message.err(err1 + '' + err2);
            }
        };
    }

    private removeEmptyKeys(yamlKeys: string[]) {
        return yamlKeys.filter(str => str.trim() !== "");
    }

    private parseF2YamlLink(cleanYamlLink: string) {
        const yamlKeys = cleanYamlLink.split(".");
        for (let index = 0; index < yamlKeys.length; index++) {
            if (yamlKeys[index] == "") {
                yamlKeys[index + 1] = "." + yamlKeys[index + 1];
            }

        }
        return yamlKeys;
    }

    private removeLinkSymbolsFromLink() {
        const lengthOfFrontLinkSymbols = 3;
        const lengthOfBackLinkSymbols = 1;
        const cleanYamlLink = this.yamlLink.slice(lengthOfFrontLinkSymbols, -lengthOfBackLinkSymbols);
        return cleanYamlLink;
    }

    async cleanStatusCodesFromKeys(key: string) {
        const config = vscode.workspace.getConfiguration("F2ToolInterface");
        const ignoredWords: string[] = config.get<string[]>('ignoreWords', []);
        for (let index = 0; index < ignoredWords.length; index++) {
            if (key.startsWith(ignoredWords[index])) {
                let cleanedKey = key.slice(ignoredWords[index].length).trimStart();
                return cleanedKey;
            }
        }
        return key;
    }

    createWorkLogObj() {

        const workLogObj = new yaml.Pair(
            new yaml.Scalar('WorkLog'),
            new yaml.YAMLSeq()
        );
        const emptyItem = new yaml.Scalar(null);
        (workLogObj.value as yaml.YAMLSeq).items.push(emptyItem);

        return workLogObj;
    }
    addNullValueInWorkLog(workLogObj: any) {
        const newSeq = new yaml.YAMLSeq();
        newSeq.items.push(new yaml.Scalar(null));

        workLogObj.value = newSeq;
    }

    async getWorkLogObj(taskObj: any) {
        if (!taskObj.value.items) {
            this.message.err("This is not a proper task as it does not have any items inside it");
            return
        }

        let z = taskObj;
        let workLogObj = taskObj.value.items.find((item: any) => item.key.value == "WorkLog");
        if (!workLogObj) {
            workLogObj = this.createWorkLogObj();
            taskObj.value.items.push(workLogObj);
        }
        if (!workLogObj.value.items) this.addNullValueInWorkLog(workLogObj);
        let a = workLogObj;
        return workLogObj.value;
    }

    getName() {
        const config = vscode.workspace.getConfiguration('time-tracking-and-administration');
        const userName = config.get('userName');
        return userName;
    }

    async addWorkLogInTask() {
        const taskObj = await this.getTaskObj();
        const workLogObj = await this.getWorkLogObj(taskObj);
        if (!workLogObj) return;
        let name = this.getName();
        name = new yaml.Scalar(name);
        this.updatedWorkLog.items.unshift(name);
        this.insertEntryInNode(workLogObj, this.updatedWorkLog);
        this.applyEditToDoc();
    }

    async checkIfTaskIsAlreadyInSr(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri) {
        this.docUri = srDocUri;
        this.srCode = srCode;
        await this.parseYaml();

        const wasNode = await this.getWasObj();
        if (!wasNode) return;

        let srINdex = await this.findSrEntry(srEntry);
        return srINdex;

    }
}