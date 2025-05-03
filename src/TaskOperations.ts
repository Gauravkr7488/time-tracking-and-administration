import { Timer, TimerCommands } from "./timer";
import { ValidateAndGet } from "./Validator";
import { Message, TextUtils } from "./VsCodeUtils";
import * as vscode from 'vscode';
import * as yaml from 'yaml';
import { YamlKeyExtractor } from "./ymlReferenceExtractor";
import { YamlEditors } from "./ymlModifier";


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
        this.message.info(`${srCode} is selected as the Standup Report. Please select a Task and issue the Start timer on Task command`);
        this.srCode = srCode;
    }

    async selectTask(): Promise<void> {
        if (!this.srCode) {
            this.message.err("run specify Standup report first");
            return;
        }
        if (this.timerCommand.isTaskRunnig()) {
            await this.stopTask();
        }
        if (!this.validateAndGet.isThisYamlDoc()) return; // change the name of the class
        this.yamlLink = this.textUtils.isThisYamlLink(); // uitls is a err
        if (!this.yamlLink) this.yamlLink = await this.yamlKeyExtractor.createYamlLink();
        await this.timer.startTimer(); // this needs refactoring since using old code
        const startTime = await this.timerCommand.giveStartTime();
        this.srEntry = this.yamleditors.createSrEntry(this.yamlLink, startTime);
        if (!this.srDocUri) return;
        this.yamleditors.moveEntryToWasInSr(this.srEntry, this.srCode, this.srDocUri);
        this.message.info(`The timer has started on Task: ${this.yamlLink}`);
    }

    pauseOrResumeTask() {
        this.timer.pauseResumeTimer();
    }

    async stopTask() {
        if (!this.timerCommand.isTaskRunnig()) {
            this.message.err("There is no active task");
            return;
        }
        const duration = this.timer.stopTimer();
        if (!this.srEntry) return;
        if (!this.srDocUri) return;
        await this.yamleditors.updateSrEntryDuration(this.srEntry, this.srCode, this.srDocUri, duration);
        await this.yamleditors.addWorkLogInTask();
    }
}