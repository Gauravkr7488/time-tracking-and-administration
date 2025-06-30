import { escape } from "querystring";
import { Data } from "./Data";
import { TextUtils } from "./TextUtils";
import { Message } from "./VsCodeUtils";
import { YamlTaskOperations } from "./YamlOperations";
import { YamlKeyExtractor, IdLinkCreater } from "./F2yamlLinkExtractor";
import * as vscode from 'vscode';


export class CSVOperations extends YamlTaskOperations {
    static async generateCSV() { // TODO clean this thing
        const config = vscode.workspace.getConfiguration(Data.MISC.EXTENSION_NAME);
        const csvFields = config.get<string[]>('csvFields', []);
        let csvEntry = "";
        let yamlLink = await TextUtils.isThisYamlLink();
        if (!yamlLink) yamlLink = await YamlKeyExtractor.createYamlLink();
        const isthisTask = await YamlTaskOperations.isThisTask(yamlLink);
        if (isthisTask === undefined) return;
        if (!isthisTask) yamlLink = await YamlTaskOperations.getTaskYamlLink(yamlLink);

        if (!yamlLink) {
            Message.err("nope not a task");
            return;
        }
        const taskObj = await this.getTaskObj(yamlLink);
        for (let index = 0; index < csvFields.length; index++) {
            const csvField = csvFields[index];

            if (csvField === "TaskStatus") { // for status

                let statusCode = await this.getStatusCode(taskObj.key.value)
                if (statusCode) {
                    csvEntry += statusCode;
                }
            }

            if (csvField === "SummaryLink") { // for link
                yamlLink = TextUtils.escapeCharacter(yamlLink, Data.MISC.DOUBLE_QUOTE, Data.MISC.DOUBLE_QUOTE);
                yamlLink = "\"" + yamlLink + "\"";
                csvEntry += yamlLink;
            }

            if (csvField == "IdLink") {
                let idLink = await IdLinkCreater.createIdLink();
                if(!idLink) return;
                idLink = TextUtils.escapeCharacter(idLink, Data.MISC.DOUBLE_QUOTE, Data.MISC.DOUBLE_QUOTE);
                idLink = "\"" + idLink + "\"";
                csvEntry += idLink
            }

            for (let i = 0; i < taskObj.value.items.length; i++) { // for every other field
                const item = taskObj.value.items[i];
                if (item.key.value == csvField) {
                    csvEntry += item.value.value;
                }
            }


            csvEntry += ", ";
        }
        csvEntry = csvEntry.slice(0, -2); // Now just format the csv properly

        return csvEntry;
    }


}