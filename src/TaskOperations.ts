import { ValidateAndGet } from "./Validator";
import { Message, TextUtils } from "./VsCodeUtils";

export class TaskCommands {
    private validateAndGet = new ValidateAndGet();
    private textUitls = new TextUtils();
    private message = new Message();
    specifyStandupReport(): void {
        this.validateAndGet.isThisYamlDoc();
        let srCode = this.textUitls.extractCurrentWord();
        if (!srCode) {
            this.message.err("there is no srcode under the cursor");
            return;
        }
        this.message.info(srCode);
    }
}