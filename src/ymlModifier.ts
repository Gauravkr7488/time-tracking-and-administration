import * as vscode from 'vscode';
import * as yaml from 'yaml';

export class YamlModifier {
    private srcode: string;
    private ymlLink: string;
    private context: vscode.ExtensionContext;
    private document?: vscode.TextDocument;
    private doc?: yaml.Document;

    constructor(srcode: string, ymlLink: string, context: vscode.ExtensionContext) {
        this.srcode = srcode;
        this.ymlLink = ymlLink;
        this.context = context;
    }

    public async modify(): Promise<void> {
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
        await this.applyEdit();
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

        const scalar = new yaml.Scalar(this.ymlLink);
        scalar.format = 'PLAIN'; // This is for removing quotes but it does not work
        wasNode.add(scalar);
        return true;
    }

    private async applyEdit(): Promise<void> {
        if (!this.document || !this.doc) {
            return;
        }

        let updatedYaml = this.doc.toString({
            defaultStringType: 'PLAIN',
            simpleKeys: true,
            lineWidth: 0 // this is to make sure line dont wrap
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

    private removeQuotesFromYmlLink(updatedYaml: string): string { // scalar is not working so I used this to remove the quotes
        const quotedYmlLink = `"${this.ymlLink}"`;
        if (updatedYaml.includes(quotedYmlLink)) {
            updatedYaml = updatedYaml.replace(quotedYmlLink, this.ymlLink);
        } else {
            console.log('Quotes not found in output:', updatedYaml);
        }
        return updatedYaml;
    }
}