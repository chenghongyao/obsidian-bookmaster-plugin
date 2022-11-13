import { ItemView } from "obsidian";

export default class NavHeader {
	buttonContainer: HTMLElement;
	view: ItemView;
	constructor(view: ItemView, container: HTMLElement) {
		const navHeader = container.createDiv({cls:"nav-header"});
		this.view = view;
		this.buttonContainer = navHeader.createDiv({
			cls: "nav-buttons-container"
		});
	}

	addAction(icon: string, title: string, callback: (evt: MouseEvent) => any) {
		const el = this.view.addAction(icon,title,callback,20);
		el.classList.replace("view-action","nav-action-button")
		this.buttonContainer.appendChild(el);
	}
	

}