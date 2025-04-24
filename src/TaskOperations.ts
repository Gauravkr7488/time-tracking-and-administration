import { Timer, TimerCommands } from "./timer";
import { ValidateAndGet } from "./Validator";
import { Message, TextUtils } from "./VsCodeUtils";
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlKeyExtractor } from "./ymlReferenceExtractor";
import { YamlEditors, YamlModifier } from "./ymlModifier";


export class TaskCommands {
    private validateAndGet = new ValidateAndGet();
    private textUtils = new TextUtils();
    private message = new Message();
    private timerCommand: TimerCommands;
    private context: vscode.ExtensionContext;
    private yamlLink?: string;
    private yamlKeyExtractor = new YamlKeyExtractor(); // TODO refactor this, not important 
    private timer: Timer;
    private srCode: string = '';
    private srDocUri?: vscode.Uri;
    private yamleditors = new YamlEditors();
    private srEntry?: yaml.YAMLMap<unknown, unknown>;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.timerCommand = new TimerCommands(this.context);
        this.timer = new Timer(this.context);
    }

    specifyStandupReport(): void {
        const srDoc = this.validateAndGet.getActiveDoc();
        if (!srDoc) return;
        this.srDocUri = srDoc.uri;
        if (!this.validateAndGet.isThisYamlDoc()) return;
        let srCode = this.textUtils.extractCurrentWord();
        if (!srCode) {
            this.message.err("there is no srcode under the cursor");
            return;
        }
        this.message.info(srCode);
        this.srCode = srCode;
    }

    async selectTask(): Promise<void> {
        if (!this.srCode) {
            this.message.err("run specify Standup report first");
            return;
        }
        if (this.timerCommand.isTaskRunnig()) {
            this.message.err("Timer ia already running");
            return;
        }
        if (!this.validateAndGet.isThisYamlDoc()) return; // change the name of the class
        this.yamlLink = this.textUtils.isThisYamlLink(); // uitls is a err
        if (!this.yamlLink) this.yamlLink = await this.yamlKeyExtractor.createYamlLink(); // 
        this.timer.startTimer(); // this needs refactoring since using old code
        const startTime = this.timerCommand.giveStartTime();
        this.srEntry = this.yamleditors.createSrEntry(this.yamlLink, startTime);
        // this.srEntry = srEntry;
        if (!this.srDocUri) return;
        this.yamleditors.moveEntryToWasInSr(this.srEntry, this.srCode, this.srDocUri);
        // this.message.info("Task started");
    }

    pauseOrResumeTask() {
        this.timer.pauseResumeTimer();
    }

    stopTask() {
        if (!this.timerCommand.isTaskRunnig()) {
            this.message.err("There is no active task");
        }
        const duration = this.timer.stopTimer();
        if (!this.srEntry) return;
        if (!this.srDocUri) return;
        // this.yamleditors.updateSrEntryDuration(this.srEntry, this.srCode, this.srDocUri, duration); // TODO complete this 

    }


}