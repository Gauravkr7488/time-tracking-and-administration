import { Timer } from "./timer";
import { ActiveDocAndEditor } from "./VsCodeUtils";
import { TextUtils } from "./TextUtils";
import { Message } from './VsCodeUtils';
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlKeyExtractor } from "./ymlReferenceExtractor";
import { YamlEditors } from "./ymlModifier";
import { LinkFollower } from "./linkFollower";
import { Data } from "./Data";


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
        if (!this.srCode) {
            Message.err(Data.MESSAGES.ERRORS.RUN_SPECIFY_SR_FIRST);
            return;
        }

        if (Timer.isTaskRunnig()) await this.stopTask();

        let yamlLink = await TextUtils.isThisYamlLink();
        if (!yamlLink) yamlLink = await YamlKeyExtractor.createYamlLink();

        const isthisTask = await YamlEditors.isThisTask(yamlLink);
        if(!isthisTask){
            Message.err("nope not a task");
            return;
        }

        await Timer.startTimer();
        const startTime = await Timer.giveStartTime();
        if (!startTime) return;
        const srEntry = YamlEditors.createSrEntry(yamlLink, startTime);

        if (!this.srDocUri) return;
        let srEntryIndex = await YamlEditors.checkIfTaskIsAlreadyInSr(srEntry, this.srCode, this.srDocUri);
        if (srEntryIndex == -1) YamlEditors.moveEntryToWasInSr(srEntry, this.srCode, this.srDocUri);

        this.srEntry = srEntry;

        Message.info(Data.MESSAGES.INFO.TASK_SELECTED(yamlLink));
    }

    public static pauseOrResumeTask() {
        if (!Timer.isTaskRunnig()) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TASK);
            return;
        }

        Timer.pauseResumeTimer();
    }

    public static async stopTask() {
        if (!Timer.isTaskRunnig()) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TASK);
            return;
        }
        const duration = Timer.stopTimer();
        if (duration === undefined) return;
        if (!this.srEntry) return;
        if (!this.srDocUri) return;
        if (!this.srCode) return;
        await YamlEditors.updateSrEntryDuration(this.srEntry, this.srCode, this.srDocUri, duration);
    }

    public static async generateWorkLogs() {
        if (Timer.isTaskRunnig()) await this.stopTask();
        if (!this.srDocUri) return;
        if (!this.srCode) return;
        await YamlEditors.generateWorkLogs(this.srCode, this.srDocUri);
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