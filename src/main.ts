import {Notice,Plugin, TAbstractFile, TFile, TFolder} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSettings,DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { OB_BOOKVAULT_ID } from "./constants";
import { AbstractBook, Book, BookFolder } from "./Book";


export default class BookMasterPlugin extends Plugin {
	settings: BookMasterSettings;
	root: {[vid:string]:BookFolder} = {};
	bookMap: {[path:string]:AbstractBook};
	bookIdMap: {[bid:string]:Book};
	
	async onload() {
		await this.loadSettings();

		this.addRibbonIcon("dice","BookExplorer",(evt) => {
			this.loadAllBookVaults().then(()=>{
				console.log(this.root);
				console.log(this.bookMap);
				console.log(this.bookIdMap);
				new Notice("hello world");
			})
		});
	}

	onunload() {
	}

	// TODO: async,too slow
	private async walkBookVault(vid:string, vaultPath: string, rootPath: string, root: BookFolder,map: {[path:string]:AbstractBook}, validBookExts: Array<string>) {
		const files = utils.fs.readdirSync(utils.normalizePath(vaultPath,rootPath));
		for(var i = 0; i < files.length; i++) {
			const name = files[i];
			const path = rootPath+"/"+name;
			const stat = utils.fs.statSync(utils.normalizePath(vaultPath,path));
			const entry = `${vid}:${path}`;
			if (stat.isDirectory()) {
				if (name.startsWith(".")) continue;
				const folder = new BookFolder(root,vid,name,path);
				root.push(folder);
				map[entry] = folder;
				await this.walkBookVault(vid,vaultPath,path,folder,map,validBookExts);
			} else {
				const ext = utils.getExtName(path);
				if (!utils.isValidBook(name,ext,validBookExts)) continue;
				const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
				const book = new Book(root,vid, path,bookname,ext);
				book.loadBookData(null); // init book data
				root.push(book);
				map[entry] = book;
			}
		}
	}

	private getBookFolder(vid:string, path: string, rootFolder: BookFolder) {
		const nodes = path.split("/");
		var p = "";
		var folder = rootFolder;

		for(let i = 0; i < nodes.length-1; i++) {
			p += "/" + nodes[i];
			const id = `${vid}:${p}`;
			
			var f = this.bookMap[id];
			if (!f || !f.isFolder()) {
				f = new BookFolder(folder,vid,nodes[i],path,true);
				folder.push(f);
				this.bookMap[id] = f;
			}
			folder = f as BookFolder;
		}
		return folder;
	}

	private getBookVaultPath(vid: string) {
		return vid === OB_BOOKVAULT_ID ? (this.app.vault.adapter as any).basePath : this.settings.deviceSetting[utils.appId].bookVaultPaths[vid];
	}
	private getBookVaultName(vid: string) {
		return vid === OB_BOOKVAULT_ID ? this.app.vault.getName() : this.settings.bookVaultNames[vid];
	}
	private getBookDataPath() {
		return this.settings.dataPath;
	}


	private async loadBookData() {
		const dataFolder = this.app.vault.getAbstractFileByPath(this.getBookDataPath()) as TFolder;
		if (!dataFolder || !(dataFolder instanceof TFolder)) return;
		for(var i = 0 ;i < dataFolder.children.length; i++) {
			const file = dataFolder.children[i];
			if (!(file instanceof TFile)) continue;
			const meta = await this.app.metadataCache.getFileCache(file as TFile).frontmatter;
			if (!meta["book-meta"]) continue;

			const {vid,bid,path,name,ext,visual} = meta;
			if (!this.root[vid] || !vid || !bid)continue;

			const entry = `${vid}:${path}`;
			var book = this.bookMap[entry];

			if (!book || book.isFolder()) {
				const folder = this.getBookFolder(vid,path,this.root[vid]);
				book = new Book(folder,vid,path,name,ext,bid,visual,true);
				this.bookMap[entry] = book;
			}
			(book as Book).loadBookData(meta);
			this.bookIdMap[bid] = book as Book;
		}
	}
	private async loadBookVault(vid: string) {
		const vaultPath = this.getBookVaultPath(vid);
		const vaultName = this.getBookVaultName(vid);
		if (!utils.isFolderExists(vaultPath)) { // TODO: virtual vault
			new Notice(`书库“${vaultName}(${vid}):${vaultPath}”不存在`); 
			return;
		}		

		if (this.root[vid]) {
			// this.root[vid].name = vaultName;
			this.root[vid].children = []; // clear
		} else {
			this.root[vid] = new BookFolder(null,vid,vaultName,null);	
		}
		await this.walkBookVault(vid,vaultPath,"",this.root[vid],this.bookMap,this.settings.validBookExts);
	}

	private async loadAllBookVaults() {

		// clear
		this.bookMap = {} 
		this.bookIdMap = {}

		// load book file
		for(const vid in this.settings.bookVaultNames) {
			await this.loadBookVault(vid);
		}
		await this.loadBookVault(OB_BOOKVAULT_ID);

		// load book data
		await this.loadBookData();
	}

	private async getBookByPath(vid: string, path: string) {
		const entry = `${vid}:${path}`;
		if (this.bookMap) {
			return this.bookMap[entry];
		} else {
			return this.loadAllBookVaults().then(() => {
				return this.bookMap[entry];
			})
		}
	}

	private async getBookById(bid: string) {
		if (this.bookIdMap) {
			return this.bookIdMap[bid];
		} else {
			return this.loadAllBookVaults().then(() => {
				return this.bookIdMap[bid];
			})
		}
	}

	private async loadSettings() {
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
