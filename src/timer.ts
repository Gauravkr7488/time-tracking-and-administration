import * as vscode from 'vscode';

export class Timer {
    private context: vscode.ExtensionContext;
    private static readonly START_TIME_KEY = 'timerStartTime';
    private static readonly ACCUMULATED_TIME_KEY = 'timerAccumulatedTime';
    private static readonly IS_PAUSED_KEY = 'timerIsPaused';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public startTimer(): string {
        const isPaused = this.context.globalState.get(Timer.IS_PAUSED_KEY) as boolean;
        if (isPaused) {
            vscode.window.showErrorMessage('Timer is paused. Resume or stop it first.');
            return '[Error: Timer is paused. Resume or stop it first.]';
        }

        const startTime = this.context.globalState.get(Timer.START_TIME_KEY) as number | undefined;
        if (startTime) {
            vscode.window.showErrorMessage('Timer is already running.');
            return '[Error: Timer is already running.]';
        }

        // Start the timer
        const now = Date.now();
        this.context.globalState.update(Timer.START_TIME_KEY, now);
        this.context.globalState.update(Timer.ACCUMULATED_TIME_KEY, 0); // Reset accumulated time
        this.context.globalState.update(Timer.IS_PAUSED_KEY, false);

        // Format the start time
        const startDate = new Date(now);
        const formattedTime = startDate.toLocaleTimeString(); // e.g., "12:34:56 PM"
        const result = `[started task at ${formattedTime}]`;

        // Show message and return string
        vscode.window.showInformationMessage('Timer started.');
        return result;
    }

    public pauseResumeTimer(): void {
        const startTime = this.context.globalState.get(Timer.START_TIME_KEY) as number | undefined;
        const isPaused = this.context.globalState.get(Timer.IS_PAUSED_KEY) as boolean;

        if (!startTime && !isPaused) {
            vscode.window.showErrorMessage('No timer running or paused. Start the timer first.');
            return;
        }

        if (startTime && !isPaused) {
            // Pause the timer
            const currentTime = Date.now();
            const elapsed = currentTime - startTime;
            const accumulatedTime = (this.context.globalState.get(Timer.ACCUMULATED_TIME_KEY) as number || 0) + elapsed;

            this.context.globalState.update(Timer.START_TIME_KEY, undefined);
            this.context.globalState.update(Timer.ACCUMULATED_TIME_KEY, accumulatedTime);
            this.context.globalState.update(Timer.IS_PAUSED_KEY, true);
            vscode.window.showInformationMessage('Timer paused.');
        } else if (isPaused) {
            // Resume the timer
            this.context.globalState.update(Timer.START_TIME_KEY, Date.now());
            this.context.globalState.update(Timer.IS_PAUSED_KEY, false);
            vscode.window.showInformationMessage('Timer resumed.');
        }
    }

    public stopTimer(): void {
        const startTime = this.context.globalState.get(Timer.START_TIME_KEY) as number | undefined;
        const accumulatedTime = this.context.globalState.get(Timer.ACCUMULATED_TIME_KEY) as number || 0;
        const isPaused = this.context.globalState.get(Timer.IS_PAUSED_KEY) as boolean;

        if (!startTime && !isPaused) {
            vscode.window.showErrorMessage('No timer running or paused. Start the timer first.');
            return;
        }

        // Calculate total duration
        let totalDurationMs = accumulatedTime;
        if (startTime) {
            // If running, add the final segment
            const endTime = Date.now();
            totalDurationMs += endTime - startTime;
        }

        // Convert to seconds and minutes
        const durationSeconds = (totalDurationMs / 1000).toFixed(2);
        const durationMinutes = (totalDurationMs / 1000 / 60).toFixed(2);

        // Show duration and reset
        vscode.window.showInformationMessage(
            `Timer stopped. Duration: ${durationSeconds} seconds (${durationMinutes} minutes)`
        );
        this.context.globalState.update(Timer.START_TIME_KEY, undefined);
        this.context.globalState.update(Timer.ACCUMULATED_TIME_KEY, 0);
        this.context.globalState.update(Timer.IS_PAUSED_KEY, false);
    }
}