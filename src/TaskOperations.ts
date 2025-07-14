import { Timer } from "./timer";
import { VsCodeUtils } from "./VsCodeUtils";
import { StringOperation } from "./StringOperations";
import { Message } from './VsCodeUtils';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { F2yamlLinkExtractor } from "./f2yamlLinkExtractor";
import { YamlTaskOperations } from "./YamlOperations";
import { LinkFollower } from "./linkFollower";
import { Data } from "./Data";
import { CSVOperations } from "./CSV-Operations";


export class TaskCommands {

    private static srCode?: string;
    private static srDocUri?: vscode.Uri;
    private static srEntry?: yaml.YAMLMap<unknown, unknown>;

    public static async specifyStandupReport() {
        if (Timer.isTaskRunnig()) await this.stopTask();
        const srDoc = VsCodeUtils.getActiveDoc();
        const srCode = StringOperation.extractSrCode();

        this.srDocUri = srDoc.uri;
        this.srCode = srCode;

        Message.info(Data.MESSAGES.INFO.SR_SPECIFIED(srCode));
    }

    public static async selectTask(): Promise<void> {
        try {
            const activeDoc = VsCodeUtils.getActiveDoc();
            const cursorPosition = VsCodeUtils.getCursorPosition();
            // if (!activeDoc || !cursorPosition) return;

            // let checkDocStructure = await YamlTaskOperations.parseYaml(activeDoc.uri);
            // if (!checkDocStructure) return;
            let operationStatus = true;
            if (!this.srCode || !this.srDocUri) throw new Error(Data.MESSAGES.ERRORS.RUN_SPECIFY_SR_FIRST);

            if (Timer.isTaskRunnig()) operationStatus = await this.stopTask();
            if (!operationStatus) return
            let yamlLink = await StringOperation.getYamlLink(activeDoc, cursorPosition);
            if (!yamlLink) yamlLink = await F2yamlLinkExtractor.createF2YamlSummaryLink(activeDoc, cursorPosition);

            const isthisTask = StringOperation.isThisTask(yamlLink);
            // if (isthisTask === undefined) return;
            // if (!isthisTask) yamlLink = await YamlTaskOperations.getTaskYamlLink(yamlLink);

            if (!isthisTask) throw new Error(Data.MESSAGES.ERRORS.NOT_A_TASK);

            await Timer.startTimer();
            const startTime = await Timer.giveStartTime();
            if (!startTime) return;
            const srEntry = YamlTaskOperations.createSrEntry(yamlLink, startTime);

            // if (!this.srDocUri) return;
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
        const srDoc = VsCodeUtils.getActiveDoc();
        if (!srDoc) return;

        const srCode = StringOperation.extractSrCode();
        if (!srCode) {
            Message.err(Data.MESSAGES.ERRORS.NO_SR_CODE);
            return;
        }

        try {
            if (srCode == this.srCode) {
                if (Timer.isTaskRunnig()) await this.stopTask();
            }
            let workLogGenerated = await YamlTaskOperations.generateWorkLogs(srCode, srDoc.uri);
            if (!workLogGenerated) return
            Message.info("Worklog Generated");
        } catch (error) {
            Message.err(error);
        }
    }

    static async generateCSV() {
        const activeDoc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();
        if (!activeDoc || !cursorPosition) return;

        const csvEntry = await CSVOperations.generateCSV(activeDoc, cursorPosition);
        if (!csvEntry) return;
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(csvEntry));
        vscode.env.clipboard.writeText(csvEntry);
    }

}

export class LinkCommands {

    // private static yamlLink?: string;
    // private static linkFollower = new LinkFollower();

    public static async extractF2YamlSummaryLink() {
        const activeDoc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();
        if (!activeDoc || !cursorPosition) return;

        let f2YamlSymmaryLink = await StringOperation.getYamlLink(activeDoc, cursorPosition);
        if (!f2YamlSymmaryLink) f2YamlSymmaryLink = await F2yamlLinkExtractor.createF2YamlSummaryLink(activeDoc, cursorPosition);
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(f2YamlSymmaryLink));
        vscode.env.clipboard.writeText(f2YamlSymmaryLink);
    }

    static async extractF2YamlIdLink() {
        const activeDoc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();
        if (!activeDoc || !cursorPosition) return;

        let f2YamlIdLink = await StringOperation.getYamlLink(activeDoc, cursorPosition);
        if (!f2YamlIdLink) f2YamlIdLink = await F2yamlLinkExtractor.createF2YamlIdLink(activeDoc, cursorPosition);
        Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(f2YamlIdLink));
        vscode.env.clipboard.writeText(f2YamlIdLink);
    }

    // public static async generateOrCopyF2yamlReference() {
    //     this.yamlLink = TextUtils.isThisYamlReference();
    //     if (!this.yamlLink) return;
    //     let cleanLink = this.yamlLink.slice(2, -2);

    //     if (!this.yamlLink) {
    //         this.yamlLink = await F2yamlLinkExtractor.createF2YamlSummaryLink(activeDoc, cursorPosition);
    //         cleanLink = this.yamlLink.slice(3, -1);
    //     }
    //     const f2YamlRef = `$@${cleanLink}@$`;
    //     Message.info(Data.MESSAGES.INFO.COPIED_TO_CLIPBOARD(f2YamlRef));
    //     vscode.env.clipboard.writeText(f2YamlRef);
    // }


    public static async followF2yamlLink() {
        const activeDoc = VsCodeUtils.getActiveDoc();
        const cursorPosition = VsCodeUtils.getCursorPosition();
        if (!activeDoc || !cursorPosition) return;
        let yamlLink = await StringOperation.getYamlLink(activeDoc, cursorPosition);
        if (!yamlLink) throw new Error("there is no link"); // TODO Fix this ie there should always be a link and if there is not then we should do try catch here
        if(activeDoc.languageId == "csv") yamlLink = StringOperation.removeExtraQuotes(yamlLink); 
        LinkFollower.followF2yamlLink(yamlLink);
    }
}