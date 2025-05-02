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
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            this.message.err("no srCode not found");
            return;
        }
        return srNode;
    }

    private async getWasObj() {
        const srNode = await this.getSrObj();
        if (!srNode) return;
        const wasNode = srNode.get("Was");
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
        srEntryObj.items[0].value.items[0].value = duration;
        wasNode.items[srEntryIndex] = srEntryObj;
        this.updatedWorkLog = srEntryObj.items[0].value;
    }

    async updateSrEntryDuration(srEntry: yaml.YAMLMap<unknown, unknown>, srCode: string, srDocUri: vscode.Uri, duration: string) {
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
        const cleanF2YamlLink = this.removeLinkSymbolsFromLink();
        const yamlKeys = this.parseF2YamlLink(cleanF2YamlLink);
        const cleanYamlKeys = this.removeEmptyKeys(yamlKeys);
        await this.createFileURIandParseYaml(cleanYamlKeys);
        
        // we need to navigate into the yamland then get the "WorkLog" for now
        if (!this.yamlDoc) return;
        const topLevelObj: any = this.yamlDoc.get(cleanYamlKeys[0]);
        let parentObj = topLevelObj;

        for (let index = 1; index < cleanYamlKeys.length; index++) {
            for (const item of parentObj.items) {
                const cleanedKey = await this.cleanStatusCodesFromKeys(item.key.value);
                if (cleanedKey === cleanYamlKeys[index]) {
                    parentObj = item.value; // Move deeper into the tree
                    // let a = parentObj;
                    if (index == cleanYamlKeys.length - 1) return parentObj;
                    break;
                }
            }
        }

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
        }catch(err1: any){
            try{
                let relativePathOfFile = relativePath + ".yaml";
                if (!vscode.workspace.workspaceFolders) return;
                const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePathOfFile);
                this.docUri = fileUri;
                await this.parseYaml();

            }catch(err2: any){
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
                let a = key.slice(ignoredWords[index].length).trimStart();
                return a;
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
    addNullValueInWorkLog(workLogObj: any){
        const newSeq = new yaml.YAMLSeq();
        newSeq.items.push(new yaml.Scalar(null));
    
        workLogObj.value = newSeq;
    }

    async getWorkLogObj(taskObj: any) {
        if (!taskObj.items) {
            this.message.err("This is not a proper task as it does not have any items inside it");
            return
        }
       
        let z = taskObj;
        let workLogObj = taskObj.items.find((item: any) => item.key.value == "WorkLog");
        if (!workLogObj) {
            workLogObj = this.createWorkLogObj();
            taskObj.items.push(workLogObj);
        }
        if(!workLogObj.value.items) this.addNullValueInWorkLog(workLogObj);
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
}