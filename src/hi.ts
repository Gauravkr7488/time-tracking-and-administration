import * as vscode from 'vscode';
import * as yaml from 'yaml';

export function modifyYaml() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active text editor.");
        return;
    }

    const document = editor.document;
    if (document.languageId !== "yaml") {
        vscode.window.showErrorMessage("This command only works with YAML files.");
        return;
    }

    let text = document.getText();
    let doc;

    try {
        doc = yaml.parseDocument(text); // Parse only once
    } catch (error) {
        vscode.window.showErrorMessage("Failed to parse YAML.");
        return;
    }

    // Find "SR"
    const srNode = doc.get("SR", true);
    if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
        vscode.window.showErrorMessage('Invalid YAML structure. "SR" not found.');
        return;
    }

    // Find "was" inside "SR"
    let wasNode = srNode.get("was", true);
    if (!wasNode) {
        vscode.window.showErrorMessage('Invalid YAML structure. "SR.was" not found.');
        return;
    }

    // Ensure "was" is a sequence (array)
    if (!(wasNode instanceof yaml.YAMLSeq)) {
        vscode.window.showErrorMessage('Invalid YAML structure. "SR.was" is not a list.');
        return;
    }

    // Append "hi" to the sequence
    wasNode.add("hi");

    // Convert back to YAML
    const updatedYaml = String(doc);

    editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        editBuilder.replace(fullRange, updatedYaml);
    });
}
