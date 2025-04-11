import * as vscode from 'vscode';
import * as yaml from 'yaml';

export class YamlModifier {
    private srcode: string;
    private ymlLink: string;
    private context: vscode.ExtensionContext;
    private document?: vscode.TextDocument;
    private doc?: yaml.Document;
    private fullLink?: string;

    constructor(srcode: string, ymlLink: string, context: vscode.ExtensionContext) {
        this.srcode = srcode;
        this.ymlLink = ymlLink;
        this.context = context;
    }

    public async modify(timeLogString: string): Promise<void> {
        if (!this.validateStoredUri()) {
            return;
        }
        if (!this.findDocument()) {
            return;
        }
        if (!this.validateYaml()) {
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
        // await this.applyEdit();
    }

    private validateStoredUri(): boolean {
        const capturedDocUri = this.context.globalState.get('capturedDocumentUri') as string;
        if (!capturedDocUri) {
            vscode.window.showErrorMessage("No document URI stored in global state. Run 'extractYamlKey' first.");
            return false;
        }
        return true;
    }

    private findDocument(): boolean {
        const capturedDocUri = this.context.globalState.get('capturedDocumentUri') as string;
        this.document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === capturedDocUri);
        if (!this.document) {
            vscode.window.showErrorMessage("Stored document not found. It may have been closed.");
            return false;
        }
        return true;
    }

    private validateYaml(): boolean {
        if (!this.document || this.document.languageId !== "yaml") {
            vscode.window.showErrorMessage("This command only works with YAML files.");
            return false;
        }
        return true;
    }

    private parseYaml(): boolean {
        if (!this.document) {
            return false;
        }
        const text = this.document.getText();
        try {
            this.doc = yaml.parseDocument(text);
            return true;
        } catch (error) {
            vscode.window.showErrorMessage("Failed to parse YAML");
            return false;
        }
    }

    private modifyNode(): boolean {
        if (!this.doc) {
            return false;
        }

        const srNode = this.doc.get(this.srcode, true);
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
        // Make sure we have a document and parse it if needed
        if (!this.doc) {
            if (!this.findDocument()) {
                return false;
            }
            if (!this.validateYaml()) {
                return false;
            }
            if (!this.parseYaml()) {
                return false;
            }
        }

        // At this point, this.doc should be defined
        if (!this.doc) {
            vscode.window.showErrorMessage("Failed to parse YAML document.");
            return false;
        }

        const srNode = this.doc.get(this.srcode, true);
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

        // Find the YAML link in the "was" list
        const linkIndex = wasNode.items.findIndex(item => {
            if (!(item instanceof yaml.Scalar)) {
                return false;
            }

            // Check if the item starts with our ymlLink (to handle cases where it already has a timer)
            const itemValue = String(item.value);
            return itemValue === this.ymlLink || itemValue.startsWith(`${this.ymlLink} `);
        });

        if (linkIndex === -1) {
            vscode.window.showErrorMessage(`Could not find an entry starting with "${this.ymlLink}" in "was" list.`);
            return false;
        }

        // Update the link with the new timer string
        this.fullLink = `${this.ymlLink} ${timerString}`;
        wasNode.items[linkIndex] = new yaml.Scalar(this.fullLink);

        await this.applyEdit();
        return true;
    }

    private async applyEdit(): Promise<void> {
        if (!this.document || !this.doc) {
            return;
        }

        let updatedYaml = this.doc.toString({
            defaultStringType: 'PLAIN',
            simpleKeys: true,
            lineWidth: 0 // Prevent wrapping
        });

        updatedYaml = this.removeQuotesFromYmlLink(updatedYaml);

        console.log('Final YAML:', updatedYaml);

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            this.document.positionAt(0),
            this.document.positionAt(this.document.getText().length)
        );
        edit.replace(this.document.uri, fullRange, updatedYaml);

        await vscode.workspace.applyEdit(edit);
    }

    public async isYmlLinkInSr(): Promise<boolean> {
        // Make sure we have a document and parse it if needed
        if (!this.doc) {
            if (!this.findDocument()) {
                return false;
            }
            if (!this.validateYaml()) {
                return false;
            }
            if (!this.parseYaml()) {
                return false;
            }
        }

        // At this point, this.doc should be defined
        if (!this.doc) {
            vscode.window.showErrorMessage("Failed to parse YAML document.");
            return false;
        }

        const srNode = this.doc.get(this.srcode, true);
        if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}" not found or not an object.`);
            return false;
        }

        let wasNode = srNode.get("was", true) || srNode.get("Was", true);
        if (!wasNode) {
            // If there's no "was" node, the link definitely isn't there
            return false;
        }

        if (!(wasNode instanceof yaml.YAMLSeq)) {
            vscode.window.showErrorMessage(`Invalid YAML structure. "${this.srcode}.was" is not a list.`);
            return false;
        }

        // Check if the ymlLink exists in the "was" list
        const linkExists = wasNode.items.some(item => {
            if (!(item instanceof yaml.Scalar)) {
                return false;
            }

            // Get the item value as string
            const itemValue = String(item.value);

            // Check if the item is equal to our ymlLink or starts with our ymlLink followed by a space
            // (to handle cases where it has a timer string)
            return itemValue === this.ymlLink || itemValue.startsWith(`${this.ymlLink} `);
        });
        vscode.window.showInformationMessage(`block 0 is active`);

        return linkExists;
    }

    public async addDurationToTimer(additionalMinutes: number): Promise<boolean> {
        // Make sure we have a document and parse it if needed
        if (!this.doc) {
            if (!this.findDocument()) {
                return false;
            }
            if (!this.validateYaml()) {
                return false;
            }
            if (!this.parseYaml()) {
                return false;
            }
        }

        // At this point, this.doc should be defined
        if (!this.doc) {
            vscode.window.showErrorMessage("Failed to parse YAML document.");
            return false;
        }

        const srNode = this.doc.get(this.srcode, true);
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

        // Find the YAML link in the "was" list
        const linkIndex = wasNode.items.findIndex(item => {
            if (!(item instanceof yaml.Scalar)) {
                return false;
            }

            // Check if the item starts with our ymlLink
            const itemValue = String(item.value);
            return itemValue.startsWith(this.ymlLink);
        });

        if (linkIndex === -1) {
            vscode.window.showErrorMessage(`Could not find an entry starting with "${this.ymlLink}" in "was" list.`);
            return false;
        }

        // Extract current timer string
        const currentItem = String(wasNode.items[linkIndex].value);
        console.log('Current item:', currentItem);

        // Parse the timer information with a more flexible regex
        // This pattern is more lenient with spaces and the timestamp format
        const timerMatch = currentItem.match(/\[\s*(\d+(?:\.\d+)?)\s*m,\s*"([^"]*)"\s*,\s*(\d+\s*T?\s*\d*)\s*\]/);

        if (!timerMatch) {
            vscode.window.showErrorMessage(`Could not parse timer information from ${currentItem}`);
            return false;
        }

        // Extract components
        const currentDuration = parseFloat(timerMatch[1]);
        const status = timerMatch[2]; // Keep the existing status
        const timestamp = timerMatch[3]; // Keep the existing timestamp as-is

        // Calculate new duration
        const newDuration = currentDuration + additionalMinutes;
        // Format with up to 2 decimal places but no trailing zeros
        const formattedDuration = newDuration % 1 === 0 ? newDuration.toString() : newDuration.toFixed(2).replace(/\.?0+$/, '');

        // Create new timer string while preserving the original format
        const newTimerString = `[ ${formattedDuration}m, "${status}", ${timestamp} ]`;
        this.fullLink = `${this.ymlLink} ${newTimerString}`;

        // Update the item
        wasNode.items[linkIndex] = new yaml.Scalar(this.fullLink);

        // Apply the edit
        await this.applyEdit();
        return true;
    }

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

        console.log('Processed YAML (quotes removed):', updatedYaml);
        return updatedYaml;
    }
}