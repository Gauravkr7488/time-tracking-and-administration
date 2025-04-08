import * as vscode from 'vscode';

export class Timer {
    private context: vscode.ExtensionContext;
    private static readonly START_TIME_KEY = 'timerStartTime';
    private static readonly ACCUMULATED_TIME_KEY = 'timerAccumulatedTime';
    private static readonly IS_PAUSED_KEY = 'timerIsPaused';
    private static readonly START_TIME_ISO_KEY = 'timerStartTimeISO';
    private static readonly PAUSE_RESUME_STATUS_KEY = 'timerPauseResumeStatus';
    private static readonly DURATION_MINUTES_KEY = 'timerDurationMinutes';

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

        // Save start time in ISO format (yyyymmddhhmmss)
        const startDate = new Date(now);
        const isoFormat = this.formatDateToCustomISO(startDate);
        this.context.globalState.update(Timer.START_TIME_ISO_KEY, isoFormat);

        // Format the start time for display
        const formattedTime = startDate.toLocaleTimeString();
        const result = `started task at ${formattedTime}`;

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
            
            // Save pause status
            this.context.globalState.update(Timer.PAUSE_RESUME_STATUS_KEY, 'paused');
            
            vscode.window.showInformationMessage('Timer paused.');
        } else if (isPaused) {
            // Resume the timer
            this.context.globalState.update(Timer.START_TIME_KEY, Date.now());
            this.context.globalState.update(Timer.IS_PAUSED_KEY, false);
            
            // Save resume status
            this.context.globalState.update(Timer.PAUSE_RESUME_STATUS_KEY, 'resumed');
            
            vscode.window.showInformationMessage('Timer resumed.');
        }
    }

    public stopTimer(): string {
        const startTime = this.context.globalState.get(Timer.START_TIME_KEY) as number | undefined;
        const accumulatedTime = this.context.globalState.get(Timer.ACCUMULATED_TIME_KEY) as number || 0;
        const isPaused = this.context.globalState.get(Timer.IS_PAUSED_KEY) as boolean;

        if (!startTime && !isPaused) {
            vscode.window.showErrorMessage('No timer running or paused. Start the timer first.');
            return '[Error: No timer running or paused. Start the timer first.]';
        }

        // Calculate total duration
        let totalDurationMs = accumulatedTime;
        if (startTime) {
            // If running, add the final segment
            const endTime = Date.now();
            totalDurationMs += endTime - startTime;
        }

        // Convert to minutes
        // const durationMinutes = parseFloat((totalDurationMs / 1000 / 60).toFixed(2));
        const durationMinutes = Math.round(totalDurationMs / 1000 / 60);


        // Save duration in minutes to global state
        this.context.globalState.update(Timer.DURATION_MINUTES_KEY, durationMinutes);

        // Format the return string
        const result = `[${durationMinutes}m]`;

        // Show duration and reset
        const durationSeconds = (totalDurationMs / 1000).toFixed(2);
        vscode.window.showInformationMessage(
            `Timer stopped. Duration: ${durationSeconds} seconds (${durationMinutes} minutes)`
        );
        this.context.globalState.update(Timer.START_TIME_KEY, undefined);
        this.context.globalState.update(Timer.ACCUMULATED_TIME_KEY, 0);
        this.context.globalState.update(Timer.IS_PAUSED_KEY, false);

        return result;
    }

    // Helper method to format date to yyyymmddhhmmss
    private formatDateToCustomISO(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        
        return `${year}${month}${day} T ${hours}${minutes}${seconds}`;
    }
}