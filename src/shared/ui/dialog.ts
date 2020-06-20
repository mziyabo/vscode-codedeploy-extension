/**
 * Executes multiple input(QuickPickItem, InputBox) prompts in sequence
 */
export class Dialog {

    title: string;
    prompts: Prompt[];
    responses: Prompt[];
    cancelled: boolean;

    constructor(title?: string) {
        this.prompts = [];
        this.responses = [];
        this.cancelled = false;
        this.title = title;
    }

    addPrompt(name: string, promptFunction: () => any) {
        const prompt: Prompt = new Prompt(name, promptFunction);
        prompt.dialog = this;
        this.prompts.push(prompt);
    }

    async run() {
        // TODO: Remove below
        // this.cancelled = false;
        let i = 0;
        while (i < this.prompts.length) {

            const prompt = this.prompts[i];
            const response = await prompt.fire();

            if (!response || response === PromptAction[PromptAction.KillDialog]) {
                this.cancelled = true;
                break;
            }
            else if (response ===  PromptAction[PromptAction.MoveNext]) {
                // TODO: Requires classes to check for nulls now :/
                prompt.response = null;
                this.responses.push(prompt);
                i++;
            }
            else if (response ===  PromptAction[PromptAction.MovePrevious]) {
                i--;
            }
            else {
                prompt.response = response;
                this.responses.push(prompt);
                i++;
            }
        }
    }

    getResponse(name: string) {
        // TODO: return the entire QuickPickItem e.g. for ServiceRolesArns
        const prompt = this.responses.find((p) => { return p.name === name; });
        if (prompt.response?.hasOwnProperty("label")) {
            return prompt.response.label;
        }

        return prompt.response;
    }
}

/**
 * Action for prompt
 */
export enum PromptAction {
    MoveNext,
    KillDialog,
    DoNothing,
    MovePrevious
}

/**
 * Prompt for user-input
 */
class Prompt {
    /**
     * Current dialog in which prompt is running
     */
    dialog: Dialog;
    promptFunction: Function;
    /**
     * Prompt response OR if prompt should Continue, Abort or Skip
     */
    response: any;
    name: string;

    constructor(name: string, promptFunction: Function) {
        this.name = name;
        this.promptFunction = promptFunction;
    }

    /**
     * Execute Prompt
     */
    async fire() {
        this.response = await this.promptFunction.call(this);
        return this.response;
    }
}