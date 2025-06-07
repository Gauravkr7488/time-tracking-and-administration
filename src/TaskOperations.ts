import { Timer } from "./timer";
import { ActiveDocAndEditor } from "./VsCodeUtils";
import { TextUtils } from "./TextUtils";
import { Message } from './VsCodeUtils';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlKeyExtractor } from "./ymlReferenceExtractor";
import { YamlTaskOperations } from "./YamlOperations";
import { LinkFollower } from "./linkFollower";
import { Data } from "./Data";
import { CSVOperations } from "./CSV-Operations";


export class TaskCommands {

    private static srCode?: string;
    private static srDocUri?: vscode.Uri;
    private static srEntry?: yaml.YAMLMap<unknown, unknown>;

    public static async specifyStandupReport() {
        const srDoc = ActiveDocAndEditor.getActiveDoc();
        if (!srDoc) return;

        const srCode = TextUtils.extractCurrentWord();
        if (!srCode) {
            Message.err(Data.MESSAGES.ERRORS.NO_SR_CODE);
            return;
        }

        this.srDocUri = srDoc.uri;
        this.srCode = srCode;

        Message.info(Data.MESSAGES.INFO.SR_SPECIFIED(srCode));
    }

    public static async selectTask(): Promise<void> {
        try {
            let doc = ActiveDocAndEditor.getActiveDoc();
            if (!doc) return;
            let checkDocStructure = await YamlTaskOperations.parseYaml(doc.uri);
            if (!checkDocStructure) return;
            let operationStatus = true;
            if (!this.srCode) {
                Message.err(Data.MESSAGES.ERRORS.RUN_SPECIFY_SR_FIRST);
                return;
            }

            if (Timer.isTaskRunnig()) operationStatus = await this.stopTask();
            if (!operationStatus) return
            let yamlLink = await TextUtils.isThisYamlLink();
            if (!yamlLink) yamlLink = await YamlKeyExtractor.createYamlLink();

            const isthisTask = await YamlTaskOperations.isThisTask(yamlLink);
            if (isthisTask === undefined) return;
            if (!isthisTask) yamlLink = await YamlTaskOperations.getTaskYamlLink(yamlLink);

            if (!yamlLink) {
                Message.err("nope not a task");
                return;
            }
            await Timer.startTimer();
            const startTime = await Timer.giveStartTime();
            if (!startTime) return;
            const srEntry = YamlTaskOperations.createSrEntry(yamlLink, startTime);

            if (!this.srDocUri) return;
            let srEntryIndex = await YamlTaskOperations.checkIfTaskIsAlreadyInSr(srEntry, this.srCode, this.srDocUri);
            if (srEntryIndex == -1) await YamlTaskOperations.moveEntryToWasInSr(srEntry, this.srCode, this.srDocUri);

            this.srEntry = srEntry;

            Message.info(Data.MESSAGES.INFO.TASK_SELECTED(yamlLink));
        } catch (error) {
            Message.err(error);
        }
    }

    public static pauseOrResumeTask() {
        if (!Timer.isTaskRunnig()) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TASK);
            return;
        }

        Timer.pauseResumeTimer();
    }

    public static async stopTask() {
        try {
            if (!this.srDocUri) return false;
            let checkDocStructure = await YamlTaskOperations.parseYaml(this.srDocUri);
            if (!checkDocStructure) return false;
            let operationStatus;
            if (!Timer.isTaskRunnig()) {
                Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TASK);
                return false;
            }
            const duration = Timer.stopTimer();
            if (duration === undefined) return false;
            if (!this.srEntry) return false;
            if (!this.srCode) return false;
            operationStatus = await YamlTaskOperations.updateSrEntryDuration(this.srEntry, this.srCode, this.srDocUri, duration);
            if (!operationStatus) return false;
            return true;
        } catch (error) {
            Message.err(error);
            return false;
        }
    }

    public static async generateWorkLogs() {
        const srDoc = ActiveDocAndEditor.getActiveDoc();
        if (!srDoc) return;

        const srCode = TextUtils.extractCurrentWord();
        if (!srCode) {
            Message.err(Data.MESSAGES.ERRORS.NO_SR_CODE);
            return;
        }
        
        try {
            if(srCode == this.srCode){
                if (Timer.isTaskRunnig()) await this.stopTask();
            }
            let workLogGenerated = await YamlTaskOperations.generateWorkLogs(srCode, srDoc.uri);
            if(!workLogGenerated) return
            Message.info("Worklog Generated");
        } catch (error) {
            Message.err(error);
        }
    }

    static async generateCSV() {
        const csvEntry = await CSVOperations.generateCSV();
        if (!csvEntry) return;
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(csvEntry));
        vscode.env.clipboard.writeText(csvEntry);
    }

}

export class LinkCommands {
    private static yamlLink?: string;
    private static linkFollower = new LinkFollower();

    public static async generateOrCopyF2yamlLink() {
        this.yamlLink = await TextUtils.isThisYamlLink();
        if (!this.yamlLink) this.yamlLink = await YamlKeyExtractor.createYamlLink();
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(this.yamlLink));
        vscode.env.clipboard.writeText(this.yamlLink);
    }

    public static async generateOrCopyF2yamlReference() {
        this.yamlLink = TextUtils.isThisYamlReference();
        if (!this.yamlLink) return;
        let cleanLink = this.yamlLink.slice(2, -2);

        if (!this.yamlLink) {
            this.yamlLink = await YamlKeyExtractor.createYamlLink();
            cleanLink = this.yamlLink.slice(3, -1);
        }
        const f2YamlRef = `$@${cleanLink}@$`;
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(f2YamlRef));
        vscode.env.clipboard.writeText(f2YamlRef);
    }


    public static async followLink() {
        this.yamlLink = await TextUtils.isThisYamlLink();
        if (!this.yamlLink) this.yamlLink = TextUtils.isThisYamlReference();
        if (!this.yamlLink) return;
        this.linkFollower.followLink(this.yamlLink);
    }
}