import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { ValidateAndGet } from './Validator';
import { Message } from './VsCodeUtils';

export class YamlModifier {
    private srcode: string;
    private ymlLink: string;
    private context: vscode.ExtensionContext;
    private document?: vscode.TextDocument;
    private yamlDocument?: yaml.Document;
    private fullLink?: string;

    constructor(srcode: string, ymlLink: string, context: vscode.ExtensionContext) {
        this.srcode = srcode;
        this.ymlLink = ymlLink;
        this.context = context;
    }

    public async insertNewTask(timeLogString: string): Promise<void> {
        if (!this.findDocument()) {
            return;
        }
        if (!this.parseYaml()) {
            return;
        }
        if (!this.modifyNode()) {
            return;
        }
        if (!this.addTimerString(timeLogString)) {
            return;
        }
    }

    private findDocument(): boolean {
        const capturedDocUri = this.context.globalState.get('capturedDocumentUri') as string;
        if (!capturedDocUri) {
            vscode.window.showErrorMessage("No document URI stored in global state. Run 'extractYamlKey' first.");
            return false;
        }
        this.document = vscode.workspace.textDocuments.find(yamlDocument => yamlDocument.uri.toString() === capturedDocUri);
        if (!this.document) {
            vscode.window.showErrorMessage("Stored document not found. It may have been closed.");
            return false;
        }
        return true;
    }

    private parseYaml(): boolean {
        if (!this.document || this.document.languageId !== "yaml") {
            vscode.window.showErrorMessage("This command only works with YAML files.");
            return false;
        }
        const text = this.document.getText();
        try {
            this.yamlDocument = yaml.parseDocument(text);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage("Failed to parse YAML");
            return false;
        }
    }

    private modifyNode(): boolean {
        if (!this.yamlDocument) {
            vscode.window.showErrorMessage("Failed to parse YAML document.");
            return false;
        }

        const srNode = this.yamlDocument.get(this.srcode, true);
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}" not found or not an object.`);
            return false;
        }

        let wasNode = srNode.get("was", true) || srNode.get("Was", true);
        if (!wasNode) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" not found.`);
            return false;
        }

        if (!(wasNode instanceof yaml.YAMLSeq)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" is not a list.`);
            return false;
        }

        const emptyItemIndex = wasNode.items.findIndex(item =>
            item === null ||
            (item instanceof yaml.Scalar && (item.value === '' || item.value === null))
        );

        if (emptyItemIndex !== -1) {
            wasNode.items[emptyItemIndex] = new yaml.Scalar(this.ymlLink);
        } else {
            const scalar = new yaml.Scalar(this.ymlLink);
            wasNode.add(scalar);
        }

        return true;
    }

    public async addTimerString(timerString: string): Promise<boolean> {
        if (!this.yamlDocument) {
            if (!this.findDocument()) {
                return false;
            }
            if (!this.parseYaml()) {
                return false;
            }
            vscode.window.showErrorMessage("Failed to parse YAML document.");
            return false;
        }

        const srNode = this.yamlDocument.get(this.srcode, true);
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}" not found or not an object.`);
            return false;
        }

        let wasNode = srNode.get("was", true) || srNode.get("Was", true);
        if (!wasNode) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" not found.`);
            return false;
        }

        if (!(wasNode instanceof yaml.YAMLSeq)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" is not a list.`);
            return false;
        }

        // Find the YAML link in the "Was" list
        const linkIndex = wasNode.items.findIndex(item => {
            if (!(item instanceof yaml.Scalar)) {
                return false;
            }

            const itemValue = String(item.value);
            return itemValue === this.ymlLink || itemValue.startsWith(`${this.ymlLink} `);
        });

        if (linkIndex === -1) {
            vscode.window.showErrorMessage(`Could not find an entry starting with "${this.ymlLink}" in "was" list.`);
            return false;
        }

        this.fullLink = `${this.ymlLink} ${timerString}`;
        wasNode.items[linkIndex] = new yaml.Scalar(this.fullLink);

        await this.applyEdit();
        return true;
    }

    private async applyEdit(): Promise<void> {
        if (!this.document || !this.yamlDocument) {
            return;
        }

        let updatedYaml = this.yamlDocument.toString({
            defaultStringType: 'PLAIN',
            simpleKeys: true,
            lineWidth: 0 // Prevent wrapping
        });

        updatedYaml = this.removeQuotesFromYmlLink(updatedYaml);

        // console.log('Final YAML:', updatedYaml);

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            this.document.positionAt(0),
            this.document.positionAt(this.document.getText().length)
        );
        edit.replace(this.document.uri, fullRange, updatedYaml);

        await vscode.workspace.applyEdit(edit);
    }

    // public async isYmlLinkInSr(): Promise<boolean> {
    //     // Make sure we have a document and parse it if needed
    //     if (!this.yamlDocument) {
    //         if (!this.findDocument()) {
    //             return false;
    //         }
    //         if (!this.parseYaml()) {
    //             return false;
    //         }
    //     }

    //     // At this point, this.yamlDocument should be defined
    //     if (!this.yamlDocument) {
    //         vscode.window.showErrorMessage("Failed to parse YAML document.");
    //         return false;
    //     }

    //     const srNode = this.yamlDocument.get(this.srcode, true);
    //     if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
    //         vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}" not found or not an object.`);
    //         return false;
    //     }

    //     let wasNode = srNode.get("was", true) || srNode.get("Was", true);
    //     if (!wasNode) {
    //         // If there's no "was" node, the link definitely isn't there
    //         return false;
    //     }

    //     if (!(wasNode instanceof yaml.YAMLSeq)) {
    //         vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" is not a list.`);
    //         return false;
    //     }

    //     // Check if the ymlLink exists in the "was" list
    //     const linkExists = wasNode.items.some(item => {
    //         if (!(item instanceof yaml.Scalar)) {
    //             return false;
    //         }

    //         // Get the item value as string
    //         const itemValue = String(item.value);

    //         // Check if the item is equal to our ymlLink or starts with our ymlLink followed by a space
    //         // (to handle cases where it has a timer string)
    //         return itemValue === this.ymlLink || itemValue.startsWith(`${this.ymlLink} `);
    //     });
    //     vscode.window.showInformationMessage(`block 0 is active`);

    //     return linkExists;
    // }

    // public async addDurationToTimer(additionalMinutes: number): Promise<boolean> {
    //     // Make sure we have a document and parse it if needed
    //     if (!this.yamlDocument) {
    //         if (!this.findDocument()) {
    //             return false;
    //         }
    //         if (!this.parseYaml()) {
    //             return false;
    //         }
    //     }

    //     // At this point, this.yamlDocument should be defined
    //     if (!this.yamlDocument) {
    //         vscode.window.showErrorMessage("Failed to parse YAML document.");
    //         return false;
    //     }

    //     const srNode = this.yamlDocument.get(this.srcode, true);
    //     if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
    //         vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}" not found or not an object.`);
    //         return false;
    //     }

    //     let wasNode = srNode.get("was", true) || srNode.get("Was", true);
    //     if (!wasNode) {
    //         vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" not found.`);
    //         return false;
    //     }

    //     if (!(wasNode instanceof yaml.YAMLSeq)) {
    //         vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" is not a list.`);
    //         return false;
    //     }

    //     // Find the YAML link in the "was" list
    //     const linkIndex = wasNode.items.findIndex(item => {
    //         if (!(item instanceof yaml.Scalar)) {
    //             return false;
    //         }

    //         // Check if the item starts with our ymlLink
    //         const itemValue = String(item.value);
    //         return itemValue.startsWith(this.ymlLink);
    //     });

    //     if (linkIndex === -1) {
    //         vscode.window.showErrorMessage(`Could not find an entry starting with "${this.ymlLink}" in "was" list.`);
    //         return false;
    //     }

    //     // Extract current timer string
    //     const currentItem = String(wasNode.items[linkIndex].value);
    //     console.log('Current item:', currentItem);

    //     // Parse the timer information with a more flexible regex
    //     // This pattern is more lenient with spaces and the timestamp format
    //     const timerMatch = currentItem.match(/\[\s*(\d+(?:\.\d+)?)\s*m,\s*"([^"]*)"\s*,\s*(\d+\s*T?\s*\d*)\s*\]/);

    //     if (!timerMatch) {
    //         vscode.window.showErrorMessage(`Could not parse timer information from ${currentItem}`);
    //         return false;
    //     }

    //     // Extract components
    //     const currentDuration = parseFloat(timerMatch[1]);
    //     const status = timerMatch[2]; // Keep the existing status
    //     const timestamp = timerMatch[3]; // Keep the existing timestamp as-is

    //     // Calculate new duration
    //     const newDuration = currentDuration + additionalMinutes;
    //     // Format with up to 2 decimal places but no trailing zeros
    //     const formattedDuration = newDuration % 1 === 0 ? newDuration.toString() : newDuration.toFixed(2).replace(/\.?0+$/, '');

    //     // Create new timer string while preserving the original format
    //     const newTimerString = `[ ${formattedDuration}m, "${status}", ${timestamp} ]`;
    //     this.fullLink = `${this.ymlLink} ${newTimerString}`;

    //     // Update the item
    //     wasNode.items[linkIndex] = new yaml.Scalar(this.fullLink);

    //     // Apply the edit
    //     await this.applyEdit();
    //     return true;
    // }

    private removeQuotesFromYmlLink(updatedYaml: string): string { // scalar is not working so I used this to remove the quotes
        const quotedYmlLink = `"${this.ymlLink}"`;
        if (updatedYaml.includes(quotedYmlLink)) {
            updatedYaml = updatedYaml.replace(quotedYmlLink, this.ymlLink);
        }

        if (this.fullLink) {
            const quotedFullLink = `"${this.fullLink}"`;
            if (updatedYaml.includes(quotedFullLink)) {
                updatedYaml = updatedYaml.replace(quotedFullLink, this.fullLink);
            }
        }

        if (this.fullLink) {
            const quotedFullLink = `'${this.fullLink}'`;
            if (updatedYaml.includes(quotedFullLink)) {
                updatedYaml = updatedYaml.replace(quotedFullLink, this.fullLink);
            }
        }

        // console.log('Processed YAML (quotes removed):', updatedYaml);
        return updatedYaml;
    }
}

export class YamlEditors {

    private validateAndGet = new ValidateAndGet();
    private yamlDoc?: yaml.Document;
    private message = new Message();
    private doc?: vscode.TextDocument;
    private docUri?: vscode.Uri;
    private srCode?: string;
    private srEntryObj: any;
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
        let a = node;
        let b = entry;
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

    async findSrEntry(srEntry: yaml.YAMLMap<unknown, unknown>) {
        const wasNode = await this.getWasObj();
        const srEntryIndex = wasNode.items.findIndex((item: any) => item.items?.[0]?.key?.value === srEntry.items[0].key);
        return srEntryIndex;
    }

    async updateDuration(srEntryIndex: any, duration: string) {
        const wasNode = await this.getWasObj();
        const srEntryObj = wasNode.items[srEntryIndex];
        srEntryObj.items[0].value.items[0].value = duration;
        wasNode.items[srEntryIndex] = srEntryObj;
        this.srEntryObj = srEntryObj;
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

    async getBackLogObj() {
        const cleanYamlLink = this.yamlLink.slice(3, -1);
        const docPath = cleanYamlLink.split("//");
        const folderName = docPath[0];
        const yamlStructure = docPath[1];
        const yamlStructureKeys = yamlStructure.split(".");
        const fileName = yamlStructureKeys[0];
        const relativePath = `./${folderName}/${fileName}.yml`;
        if (!vscode.workspace.workspaceFolders) return;
        const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePath);
        this.docUri = fileUri;
        await this.parseYaml();
        const cleanedYamlStructureOfTask = yamlStructureKeys.filter(str => str.trim() !== "");
        cleanedYamlStructureOfTask.shift();
        if (!this.yamlDoc) return;
        const category = cleanedYamlStructureOfTask[0].toString();
        const topLevelObj: any = this.yamlDoc.get(folderName + "//" + fileName);
        const categoryObj = topLevelObj.items.find((item: any) => item.key.value == category);
        if (!categoryObj) {
            this.message.err("no categoryObj not found");
            return;
        }

        for (let index = 1; index <= cleanedYamlStructureOfTask.length; index++) {
            const element = cleanedYamlStructureOfTask[index];
            let parentNode;
            let childNode;
            if (index == 1) {
                parentNode = categoryObj;
            } else {
                parentNode = childNode;
            }
            if (!parentNode) return;
            childNode = parentNode.items.find((item: any) => item.key.value == element);
            if (!childNode) {
                this.message.err(`no ${element} not found`);
                return;
            }
            // return childNode;
            let a = childNode.items.find((item: any) => item.key.value == "a");
            if (a) return childNode;
        }
    }

    async getTaskObj() {
        const cleanYamlLink = this.yamlLink.slice(3, -1);
        const yamlKeys = cleanYamlLink.split(".");
        for (let index = 0; index < yamlKeys.length; index++) {
            if (yamlKeys[index] == "") {
                yamlKeys[index + 1] = "." + yamlKeys[index + 1];
            }

        }
        const cleanYamlKeys = yamlKeys.filter(str => str.trim() !== "");
        const fileAndFolderName = cleanYamlKeys[0];
        const arrFileAndFolderName = fileAndFolderName.split("//");
        let relativePath: string = ".";
        for (let index = 0; index < arrFileAndFolderName.length; index++) {
            relativePath = relativePath + "/" + arrFileAndFolderName[index];
        }
        relativePath = relativePath + ".yml";
        if (!vscode.workspace.workspaceFolders) return;
        const fileUri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, relativePath);
        this.docUri = fileUri;
        await this.parseYaml();
        // we need to navigate into the yamland then get the "WorkLog" for now
        if (!this.yamlDoc) return;
        const topLevelObj: any = this.yamlDoc.get(cleanYamlKeys[0]);
        let parentObj = topLevelObj;

        // for (let index = 1; index < cleanYamlKeys.length; index++) {
        //     const childObj = parentObj.items.find((item: any) => await this.cleanStatusCodesFromKeys(item.key.value) == cleanYamlKeys[index]); // the fundamental issue is that the ptogress staus is being ignored in the link creation but thery are still the keys
        //     parentObj = childObj;
        //     let a = childObj;
        //     // if(childObj.key.value == "WorkLog") return childObj;
        // }

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

    getWorkLogObj(taskObj: any) {
        const workLogObj = taskObj.items.find((item: any) => item.key.value == "WorkLog");
        return workLogObj.value;
    }

    async addWorkLogInTask() {
        // navigate to the task 
        // const backLogObj = await this.getBackLogObj();
        const taskObj = await this.getTaskObj();
        const workLogObj = await this.getWorkLogObj(taskObj);
        this.insertEntryInNode(workLogObj, this.updatedWorkLog); // TODO the duration is coming under double quotes and the format is not correct we need to add name of the user. 
        this.applyEditToDoc();
        // update the worklog
    }
}