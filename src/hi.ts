import * as vscode from 'vscode';
import * as yaml from 'js-yaml';

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
    let parsedYaml: any;

    try {
        parsedYaml = yaml.load(text);
    } catch (error) {
        vscode.window.showErrorMessage("Failed to parse YAML.");
        return;
    }

    if (parsedYaml?.SR?.was && Array.isArray(parsedYaml.SR.was)) {
        const index = parsedYaml.SR.was.indexOf("B");
        if (index !== -1) {
            // parsedYaml.SR.was.splice(index + 1, 0, "hi");
            parsedYaml.SR.was.push("hi");
        } else {
            vscode.window.showErrorMessage('"B" not found in "SR.was".');
            return;
        }
    } else {
        vscode.window.showErrorMessage('Invalid YAML structure. "SR.was" not found.');
        return;
    }

    const updatedYaml = yaml.dump(parsedYaml);

    editor.edit((editBuilder) => {
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(text.length)
        );
        editBuilder.replace(fullRange, updatedYaml);
    });
}
