import {Notice,Plugin} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSettings,DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { OB_BOOKVAULT_ID } from "./constants";
import { AbstractBook, Book, BookFolder } from "./Book";


export default class BookMasterPlugin extends Plugin {
	settings: BookMasterSettings;
	root: {[vid:string]:BookFolder} = {};
	bookMap: {[path:string]:AbstractBook} = {};
	bookIdMap: {[bid:string]:Book} = {};
	
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
	private async walkBookVault(vid:string, vaultPath: string, rootPath: string, root: BookFolder,map: {[path:string]:AbstractBook}, validBookExts: Array<string>) {
		const files = utils.fs.readdirSync(utils.normalizePath(vaultPath,rootPath));
		files.forEach((name: string) => {
			const path = root+"/"+name;
			const stat = utils.fs.statSync(utils.normalizePath(vaultPath,path));

			if (stat.isDirectory()) {
				if (name.startsWith(".")) return;
				const folder = new BookFolder(root,vid,name,path);
				root.push(folder);
				map[`${vid}:${path}`] = folder;
				this.walkBookVault(vid,vaultPath,path,folder,map,validBookExts);
			} else {
				const ext = utils.getExtName(path);
				if (!utils.isValidBook(name,ext,validBookExts)) return;
				const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
				const book = new Book(root,vid, path,bookname,ext);
				root.push(book);
				map[`${vid}:${path}`] = book;
			}
		});
	}


	private getBookVaultPath(vid: string) {
		return this.settings.deviceSetting[utils.appId].bookVaultPaths[vid];
	}
	private getBookVaultName(vid: string) {
		return this.settings.bookVaultNames[vid];
	}
	private getBookDataPath() {
		return this.settings.dataPath;
	}


	// private async loadBookData() {
	// 	const {files} = await this.app.vault.adapter.list(this.getBookDataPath());
	// 	for(const file in files) {
	// 		const meta = await this.app.metadataCache.getCache(file).frontmatter;
	// 		if (!meta["vid"] || !meta["bid"])continue;
	// 		const bid = meta["bid"];
	// 		const vid = meta["vid"];
	// 		const path = meta["path"];
	// 		const book = new Book(null,vid,path,meta["name"],meta["ext"],bid,meta["visual"],true);
	// 		this.bookIdMap[bid] = book
	// 		this.bookMap[`${vid}:${path}`] = book;	// delete or rename??
	// 	}
	// }

	// run only once!
	private async loadBookVaults() {
		
		this.root = {}; // FIXME: clear all??
		this.bookMap = {} //
		for(const vid in this.settings.bookVaultNames) {
			const vaultPath = this.getBookVaultPath(vid);
			const vaultName = this.getBookVaultName(vid);
			if (!utils.isFolderExists(vaultPath)) { // TODO: virtual vault
				new Notice(`书库“${vaultName}(${vid})”不存在`); 
				continue;
			}		
			this.root[vid] = new BookFolder(null,vid,vaultName,null);	
			await this.walkBookVault(vid,vaultPath,"",this.root[vid],this.bookMap,this.settings.validBookExts);
		}
	}


	// watchBookVault() {
	// 	for(const vid in this.settings.bookVaultNames) {
	// 		const vaultPath = this.getBookVaultPath(vid);
	// 		(this.app.vault.adapter as any).watch
	// 	}
	// }

	private getBookByPath(vid: string, path: string): AbstractBook {
		return this.bookMap[`${vid}:${path}`];
	}

	private getBookById(bid: string): Book {
		return this.bookIdMap[bid];
	}

	private async loadSettings() {
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
