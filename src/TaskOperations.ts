import { Timer, TimerCommands } from "./timer";
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

    private yamlKeyExtractor = new YamlKeyExtractor();
    private yamleditors = new YamlEditors();

    private timerCommand: TimerCommands;
    private context: vscode.ExtensionContext;
    private timer: Timer;
    private srCode?: string;
    private srDocUri?: vscode.Uri;
    private srEntry?: yaml.YAMLMap<unknown, unknown>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.timerCommand = new TimerCommands(this.context);
        this.timer = new Timer(this.context);
    }

    async specifyStandupReport() {
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

    async selectTask(): Promise<void> {
        if (!this.srCode) {
            Message.err(Data.MESSAGES.ERRORS.RUN_SPECIFY_SR_FIRST);
            return;
        }

        if (this.timerCommand.isTaskRunnig()) await this.stopTask();

        let f2YamlLink = TextUtils.isThisYamlLink();
        if (!f2YamlLink) f2YamlLink = await this.yamlKeyExtractor.createYamlLink();

        await this.timer.startTimer();
        const startTime = await this.timerCommand.giveStartTime();
        const srEntry = this.yamleditors.createSrEntry(f2YamlLink, startTime);

        if (!this.srDocUri) return;
        let srEntryIndex = await this.yamleditors.checkIfTaskIsAlreadyInSr(srEntry, this.srCode, this.srDocUri);
        if (srEntryIndex == -1) this.yamleditors.moveEntryToWasInSr(srEntry, this.srCode, this.srDocUri);

        this.srEntry = srEntry;

        Message.info(Data.MESSAGES.INFO.TASK_SELECTED(f2YamlLink));
    }

    pauseOrResumeTask() {
        this.timer.pauseResumeTimer();
    }

    async stopTask() {
        if (!this.timerCommand.isTaskRunnig()) {
            Message.err(Data.MESSAGES.ERRORS.NO_ACTIVE_TASK);
            return;
        }
        const duration = this.timer.stopTimer();

        if (!this.srEntry) return;
        if (!this.srDocUri) return;
        if (!this.srCode) return;
        await this.yamleditors.updateSrEntryDuration(this.srEntry, this.srCode, this.srDocUri, duration);
    }

    async generateWorkLogs() {
        if (this.timerCommand.isTaskRunnig()) await this.stopTask();
        
        if (!this.srDocUri) return;
        if (!this.srCode) return;
        await this.yamleditors.generateWorkLogs(this.srCode, this.srDocUri);
    }


}

export class LinkCommands {
    private yamlLink?: string;
    private textUtils = new TextUtils();
    private yamlKeyExtractor = new YamlKeyExtractor(); // TODO refactor this, not important 

    async generateOrCopyF2yamlLink() {
        this.yamlLink = this.textUtils.isThisYamlLink(); // uitls is a err
        if (!this.yamlLink) this.yamlLink = await this.yamlKeyExtractor.createYamlLink();
        vscode.window.showInformationMessage(`'${this.yamlLink}' copied to your clipboard`);
        vscode.env.clipboard.writeText(this.yamlLink);
    }

    async generateOrCopyF2yamlReference2() {
        this.yamlLink = this.textUtils.isThisYamlReference();
        let cleanLink = this.yamlLink.slice(2, -2);

        if (!this.yamlLink) {
            this.yamlLink = await this.yamlKeyExtractor.createYamlLink();
            cleanLink = this.yamlLink.slice(3, -1);
        }
        let f2YamlRef2 = `$@${cleanLink}@$`;
        vscode.window.showInformationMessage(`'${f2YamlRef2}' copied to your clipboard`);
        vscode.env.clipboard.writeText(f2YamlRef2);
    }


    async followLink() {
        this.yamlLink = this.textUtils.isThisYamlLink();
        if (!this.yamlLink) this.yamlLink = this.textUtils.isThisYamlReference();
        this.linkFollower.followLink(this.yamlLink);
    }
}