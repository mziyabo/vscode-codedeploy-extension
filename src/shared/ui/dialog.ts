
export class Dialog {

    prompts: Prompt[];
    responses: Prompt[];
    cancelled: boolean;

    constructor() {
        this.prompts = [];
        this.responses = [];
        this.cancelled = undefined;
    }

    addPrompt(name: string, promptFunction: () => any) {

        let prompt: Prompt = new Prompt(name, promptFunction);
        this.prompts.push(prompt);
    }

    async run() {

        this.cancelled = false;
        for (let i: number = 0; i < this.prompts.length; i++) {
            let response = await this.prompts[i].fire();

            if (!response) {
                this.cancelled = true;
                break;
            }
            else {
                let p = this.prompts[i];
                p.response = response;
                this.responses.push(p);
            }
        }
    }

    getResponse(name: string) {

        let p = this.responses.find((prompt) => { return prompt.name == name });
        if (p.response.hasOwnProperty("label")) {
            // TODO: allow the entire QuickPickItem e.g. for ServiceRolesArns
            return p.response.label;
        }

        return p.response;
    }
}

class Prompt {

    promptFunction: Function;
    response: any;
    name: string;

    constructor(name: string, promptFunction: Function) {
        this.name = name;
        this.promptFunction = promptFunction;
    }

    async fire() {
        this.response = await this.promptFunction.call(this);
        return this.response;
    }
}