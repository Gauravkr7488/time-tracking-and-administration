import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { extractYamlKey } from './keyExtractor'; // Adjust the path as needed

export function modifyYaml(srcode : string, ymlLink : string) {
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
        doc = yaml.parseDocument(text);
    } catch (error) {
        vscode.window.showErrorMessage("Failed to parse YAML");
        return;
    }

    // Find the node with the name from srcode
    const srNode = doc.get(srcode, true);
    if (!srNode || !(srNode instanceof yaml.YAMLMap)) {
        vscode.window.showErrorMessage(`Invalid YAML structure. "${srcode}" not found or not an object.`);
        return;
    }

    // Find "was" inside the srcode node
    let wasNode = srNode.get("was", true) || srNode.get("Was", true); // Check both "was" and "Was"
    if (!wasNode) {
        vscode.window.showErrorMessage(`Invalid YAML structure. "${srcode}.was" not found.`);
        return;
    }

    // Ensure "was" is a sequence (array)
    if (!(wasNode instanceof yaml.YAMLSeq)) {
        vscode.window.showErrorMessage(`Invalid YAML structure. "${srcode}.was" is not a list.`);
        return;
    }

    // Append "hi" to the sequence
    wasNode.add(ymlLink);

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