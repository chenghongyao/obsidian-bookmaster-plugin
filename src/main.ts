import {Notice,Plugin} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSettings,DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'


export default class BookMasterPlugin extends Plugin {
	settings: BookMasterSettings;
	

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
		if (!this.settings.deviceSetting[utils.appId]) {
			this.settings.deviceSetting[utils.appId] = Object.assign({},DEFAULT_DEVICE_SETTINGS);
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}
