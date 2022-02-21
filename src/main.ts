import {
	App,
	MarkdownView,
	Menu,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	ViewCreator,
} from "obsidian";
import { around } from "monkey-around";


interface BookNoteSettings {
	bookPath: string;
}

const DEFAULT_SETTINGS: BookNoteSettings = {
	bookPath: "",
};

export default class BookNotePlugin extends Plugin {
	settings: BookNoteSettings;
	

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("dice","BookExplorer",(evt) => {
			new Notice("hello world");
		})

	}

	onunload() {
	}


	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}
