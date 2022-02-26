import {Notice,Plugin} from "obsidian";
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
			this.loadBookVaults().then(()=>{
				console.log(this.root);
				console.log(this.bookMap);
				console.log(this.bookIdMap);
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
			const path = rootPath+"/"+name;
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
		return this.settings.deviceSetting[utils.appId].bookVaultPaths[vid];
	}
	private getBookVaultName(vid: string) {
		return this.settings.bookVaultNames[vid];
	}
	private getBookDataPath() {
		return this.settings.dataPath;
	}


	private async loadBookData() {
		const {files} = await this.app.vault.adapter.list(this.getBookDataPath());
		for(const file in files) {
			const meta = await this.app.metadataCache.getCache(file).frontmatter;

			if (!meta["book-meta"]) continue;

			const bid = meta["bid"] as string;
			const vid = meta["vid"] as string;
			if (!this.root[vid] || !vid || !bid)continue;

			const path = meta["path"] as string;
			const id = `${vid}:${path}`;
			var book = this.bookMap[id];
			if (!book || book.isFolder()) {
				const folder = this.getBookFolder(vid,path,this.root[vid]);
				book = new Book(folder,vid,path,meta["name"],meta["ext"],bid,meta["visual"],true);
				this.bookMap[id] = book;
			}

			(book as Book).loadBookData(meta);
			this.bookIdMap[bid] = book as Book;
		}
	}

	// run only once!
	private async loadBookVaults() {

		// clear
		this.bookMap = {} 
		this.bookIdMap = {}

		// load book file
		for(const vid in this.settings.bookVaultNames) {
			const vaultPath = this.getBookVaultPath(vid);
			const vaultName = this.getBookVaultName(vid);
			if (!utils.isFolderExists(vaultPath)) { // TODO: virtual vault
				new Notice(`书库“${vaultName}(${vid})”不存在`); 
				continue;
			}		

			if (this.root[vid]) {
				// this.root[vid].name = vaultName;
				this.root[vid].children = []; // clear
			} else {
				this.root[vid] = new BookFolder(null,vid,vaultName,null);	
			}
			await this.walkBookVault(vid,vaultPath,"",this.root[vid],this.bookMap,this.settings.validBookExts);
		}

		// load book data
		// await this.loadBookData()
	}

	private async getBookByPath(vid: string, path: string) {
		if (this.bookMap) {
			return this.bookMap[`${vid}:${path}`];
		} else {
			return this.loadBookVaults().then(() => {
				return this.bookMap[`${vid}:${path}`];
			})
		}
	}

	private async getBookById(bid: string) {
		if (this.bookIdMap) {
			return this.bookIdMap[bid];
		} else {
			return this.loadBookVaults().then(() => {
				return this.bookIdMap[bid];
			})
		}
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
