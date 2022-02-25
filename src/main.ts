import {Notice,Plugin} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSettings,DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { OB_BOOKVAULT_ID } from "./constants";
import { AbstractBook, Book, BookFolder } from "./Book";


export default class BookMasterPlugin extends Plugin {
	settings: BookMasterSettings;
	root: {[vid:string]:BookFolder} = {};
	
	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("dice","BookExplorer",(evt) => {
			this.loadBookVaults().then(()=>{
				console.log(this.root);
				new Notice("hello world");
			})

		});



	}

	onunload() {
	}

	// TODO: async
	private async walkBookVault(vid:string, vaultPath: string, root: string, tree: Array<AbstractBook>,validBookExts: Array<string>) {
		const files = utils.fs.readdirSync(utils.normalizePath(vaultPath,root));
		files.forEach((name: string) => {
			const path = root+"/"+name;
			const stat = utils.fs.statSync(utils.normalizePath(vaultPath,path));
			if (stat.isDirectory()) {
				if (name.startsWith(".")) return;
				const folder = new BookFolder(vid,name,path);
				tree.push(folder);
				this.walkBookVault(vid,vaultPath,path,folder.children,validBookExts);
			} else {
				const ext = utils.getExtName(path);
				if (!utils.isValidBook(name,ext,validBookExts)) return;
				const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
				const book = new Book(vid,  path, bookname , ext);
				tree.push(book);
			}
		});
	}

	// run only once!
	private async loadBookVaults() {
		for(const vid in this.settings.bookVaultNames) {
			const vaultPath = this.settings.deviceSetting[utils.appId].bookVaultPaths[vid];
			const vaultName = this.settings.bookVaultNames[vid];
			if (!utils.isFolderExists(vaultPath)) { // TODO: virtual vault
				new Notice(`书库“${vaultName}(${vid})”不存在`); 
				continue;
			}
			this.root[vid] = new BookFolder(vid,vaultName,null);	
			await this.walkBookVault(vid,vaultPath,"",this.root[vid].children,this.settings.validBookExts);
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		if (!this.settings.deviceSetting[utils.appId]) {
			this.settings.deviceSetting[utils.appId] = Object.assign({},DEFAULT_DEVICE_SETTINGS);

			// this.settings.bookVaultNames[OB_BOOKVAULT_ID] = this.app.vault.getName();
			// this.settings.deviceSetting[utils.appId].bookVaultPaths[OB_BOOKVAULT_ID] = utils.fs.basePath;
			await this.saveSettings();
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}
