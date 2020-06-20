import { QuickInputButton, window, Disposable, QuickInputButtons } from 'vscode';
import { PromptAction } from './dialog';

/**
 * InputBox Control Parameters
 */
interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	ignoreFocusOut: boolean;
	value?: string;
	placeholder?: string;
	validate?: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	shouldResume?: () => Thenable<boolean>;
}

/**
 * QuickPick Control Parameters
 */
interface QuickPickParameters {
	title: string;
	step: number;
	totalSteps: number;
	ignoreFocusOut: boolean;
	placeHolder?: string;
	buttons?: QuickInputButton[];
	canPickMany?: boolean;
	shouldResume?: boolean;
}

/**
 * QuickPickItem wrapper
 */
export class QuickPickItem implements QuickPickItem {

	label: string;
	description?: string;
	detail?: string;
	picked?: boolean;
	alwaysShow?: boolean;

	constructor(options: { label: string; description: string; detail?: string; picked?: boolean }) {
		this.label = options.label;
		this.description = options.description;
		this.detail = options.detail;
		this.picked = options.picked;
	}
}

/**
 * Creates User-Input Controls
 */
export class DialogInput {

	static async showQuickPick<T extends QuickPickItem>(items: T[], options: QuickPickParameters) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<QuickPickItem | string | PromptAction>((resolve, reject) => {

				const input = window.createQuickPick();
				input.placeholder = options?.placeHolder;
				input.canSelectMany = options?.canPickMany;
				input.ignoreFocusOut = options.ignoreFocusOut;
				input.title = options.title;
				input.items = items;
				input.buttons = [
					...(options.step > 1 ? [QuickInputButtons.Back] : []),
					...(options.buttons || [])];
				input.step = options.step;
				input.totalSteps = options.totalSteps;

				disposables.push(
					input.onDidTriggerButton((item) => {
						if (item === QuickInputButtons.Back) {
							resolve(PromptAction[PromptAction.MovePrevious]);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection((items) => {
						resolve(items[0]);
						input.dispose();
					})
				);

				input.show();
			});
		} finally {
			disposables.forEach((d) => d.dispose());
		}
	}

	static async showInputBox<T extends InputBoxParameters>(prompt: string, { title, step, totalSteps, value, buttons, placeholder, ignoreFocusOut }: T): Promise<string | PromptAction> {

		const disposables: Disposable[] = [];

		try {
			return await new Promise<string | PromptAction>(async (resolve, reject) => {
				const input = window.createInputBox();

				input.prompt = prompt;
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.buttons = [
					...(step > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])];
				input.placeholder = placeholder;
				input.ignoreFocusOut = ignoreFocusOut;

				disposables.push(
					input.onDidTriggerButton((item) => {
						if (item === QuickInputButtons.Back) {
							resolve(PromptAction[PromptAction.MovePrevious]);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(() => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						input.enabled = true;
						input.busy = false;
						resolve(value);
						input.dispose();
					})
				);

				input.show();
			});
		} finally {
			disposables.forEach((d) => d.dispose());
		}
	}
}