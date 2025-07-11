import { escape } from "querystring";
import { Data } from "./Data";
import { TextUtils } from "./TextUtils";
import { VsCodeUtils, Message } from "./VsCodeUtils";
import { YamlTaskOperations } from "./YamlOperations";
import { F2yamlLinkExtractor } from "./f2yamlLinkExtractor";
import * as vscode from 'vscode';


export class CSVOperations extends YamlTaskOperations {
    static async generateCSV(activeDoc: vscode.TextDocument, cursorPosition: vscode.Position) { // TODO clean this thing
        let csvEntry = "";
        const csvFields = CSVOperations.getCsvFields();
        let f2yamlSummaryLink = await F2yamlLinkExtractor.createF2YamlSummaryLink(activeDoc, cursorPosition);


        for (const field of csvFields) {
            if (field === "TaskStatus") { // for status
                let statusCode = TextUtils.getStatusCode(activeDoc, cursorPosition);
                csvEntry += statusCode + ", ";
                continue;
            }

            if (field === "SummaryLink") { // for link
                let Escapedf2yamlSummaryLink = TextUtils.escapeCharacter(f2yamlSummaryLink, Data.MISC.DOUBLE_QUOTE, Data.MISC.DOUBLE_QUOTE);
                Escapedf2yamlSummaryLink = "\"" + Escapedf2yamlSummaryLink + "\"";
                csvEntry += Escapedf2yamlSummaryLink + ", ";
                continue;
            }

            if (field == "IdLink") {
                let idLink = await F2yamlLinkExtractor.createF2YamlIdLink(activeDoc, cursorPosition);
                if (!idLink) return;
                idLink = TextUtils.escapeCharacter(idLink, Data.MISC.DOUBLE_QUOTE, Data.MISC.DOUBLE_QUOTE);
                idLink = "\"" + idLink + "\"";
                csvEntry += idLink + ", ";
                continue;
            }

            // let taskProperty: any;
            let taskObj = await this.getTaskObj(f2yamlSummaryLink);
            for (const taskProperty of taskObj.value.items) {
                if (taskProperty.key.value == field) {
                    csvEntry += taskProperty.value + ", ";
                    continue;
                }
            }
            csvEntry += ", ";
        }


        // // let yamlLink = await TextUtils.isThisYamlLink(activeDoc, cursorPosition);
        // // if (!yamlLink) yamlLink = await F2yamlLinkExtractor.createF2YamlSummaryLink(activeDoc, cursorPosition);
        // const isthisTask = await YamlTaskOperations.isThisTask(yamlLink);
        // if (isthisTask === undefined) return;
        // if (!isthisTask) yamlLink = await YamlTaskOperations.getTaskYamlLink(yamlLink);

        // if (!yamlLink) {
        //     Message.err("nope not a task");
        //     return;
        // }
        // const taskObj = await this.getTaskObj(yamlLink);
        // for (let index = 0; index < csvFields.length; index++) {
        //     const csvField = csvFields[index];


        //     for (let i = 0; i < taskObj.value.items.length; i++) { // for every other field
        //         const item = taskObj.value.items[i];
        //         if (item.key.value == csvField) {
        //             csvEntry += item.value.value;
        //         }
        //     }


        //     csvEntry += ", ";
        // }
        csvEntry = csvEntry.slice(0, -2); // Now just format the csv properly

        return csvEntry;
    }



    private static getCsvFields() {
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const csvFields = config.get<string[]>('csvFields', []);
        return csvFields;
    }
}