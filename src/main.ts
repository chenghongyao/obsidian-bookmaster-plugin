import {Notice,Platform,Plugin, TAbstractFile, TFile, TFolder} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSetting,DEFAULT_DEVICE_SETTINGS } from "./settings";
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
			this.loadAllBookVaults().then(()=>{
				console.log(this.root);
				console.log(this.bookMap);
				console.log(this.bookIdMap);
				new Notice(`有${this.root["00"].children.length}个文件`);
				// new Notice("hello world");

				// for(var key in this.bookMap) {
				// 	const book = this.bookMap[key];
				// 	if (!book.isFolder()) {
				// 		this.saveBookData(book as Book).then(()=>{
				// 		})
				// 		break;
				// 	}
				// }

			})
		});
	}

	onunload() {
	}

	private getBookVaultPath(vid: string) {
		if (vid === OB_BOOKVAULT_ID) {
			return (this.app.vault.adapter as any).basePath;
		} else {
			const vaultPath = this.getCurrentDeviceSetting().bookVaultPaths[vid];
			if (vaultPath.startsWith("@")) {
				return (this.app.vault.adapter as any).basePath + vaultPath.substring(1);
			} else {
				return vaultPath;
			}
		}
	}
	private getBookVaultName(vid: string) {
		return vid === OB_BOOKVAULT_ID ? this.app.vault.getName() : this.settings.bookVaultNames[vid];
	}
	private getBookDataPath() {
		return this.settings.dataPath + "/book-data";
	}

	private async getBookByPath(vid: string, path: string) {
		const entry = `${vid}:${path}`;
		if (this.root.length) {	// FIXME: check book vault load status
			return this.bookMap[entry];
		} else {
			return this.loadAllBookVaults().then(() => {
				return this.bookMap[entry];
			});
		}
	}

	private async getBookById(bid: string) {
		if (this.root.length) {	 // FIXME: check book vault load status
			return this.bookIdMap[bid];
		} else {
			return this.loadAllBookVaults().then(() => {
				return this.bookIdMap[bid];
			});
		}
	}

	private getCurrentDeviceSetting() {
		return this.settings.deviceSetting[utils.appId];
	}


	// TODO: async,too slow
	private async walkBookVault(vid:string, vaultPath: string, rootPath: string, root: BookFolder,map: {[path:string]:AbstractBook}, validBookExts: Array<string>) {

		for (var i = 0; i < root.children.length; i++) {  // set all test flag of children to false
			const abs = root.children[i];
			abs._existsFlag = false;
		}

		const dirpath = utils.normalizePath(vaultPath,rootPath);
		const files = Platform.isMobile ? await utils.fs.readdir(dirpath) : utils.fs.readdirSync(dirpath);

		for(var i = 0; i < files.length; i++) {
			const name = files[i];
			const path = rootPath+"/"+name;
			const entry = `${vid}:${path}`;

			if (await utils.isFolder(utils.normalizePath(vaultPath,path))) {
				if (name.startsWith(".")) continue;

				var folder = map[entry];
				if (!folder || !folder.isFolder()) {		// new folder
					folder = new BookFolder(root,vid,name,path);
					root.push(folder);
					map[entry] = folder;	
				}

				folder._existsFlag = true;
				await this.walkBookVault(vid,vaultPath,path,folder as BookFolder,map,validBookExts);
			} else {
				const ext = utils.getExtName(path);
				if (!utils.isValidBook(name,ext,validBookExts)) continue;

				var book = map[entry] as Book;
				if (!book || book.isFolder()) {	// new file
					const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
					book = new Book(root,vid, path,bookname,ext);
					book.loadBookData(null); // init book data
					root.push(book);
					map[entry] = book;
				}

				book._existsFlag = true;
			}
		}

		// if the test flag is still false, then it has been deleted
		for (var i = 0; i < root.children.length; i++) {  
			const abs = root.children[i];
			if (abs._existsFlag) continue;

			const entry = `${abs.vid}:${abs.path}`;
			delete map[entry];
			root.children.splice(i,1);

			if (abs.isFolder()) {
				utils.cleanFolderInMap(abs as BookFolder,map);
			} 
		}
	}

	private getBookFolder(vid:string, path: string, rootFolder: BookFolder) {
		
		const nodes = path.substring(1).split("/"); // path start with '/'
		var p = "";
		var folder = rootFolder;

		for(let i = 0; i < nodes.length-1; i++) {
			p += "/" + nodes[i];
			const entry = `${vid}:${p}`;
			
			var f = this.bookMap[entry];
			if (!f || !f.isFolder()) {
				f = new BookFolder(folder,vid,nodes[i],path,true);
				folder.push(f);
				this.bookMap[entry] = f;
			}
			folder = f as BookFolder;
		}
		return folder;
	}


	// save book data safely
	async saveBookData(book: Book) {
		if (!book.hasId()) {
			const bid = book.getId();
			this.bookIdMap[bid] = book;
		}
		return book.saveBookData(this.getBookDataPath());
	}

	private async loadAllBookData() {
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
			var book = this.bookIdMap[bid];
			if (book) {
				book.lost = !Boolean(this.bookMap[entry])	// update book lost flag
				// FIXME: reload book data??
			} else {
				book = this.bookMap[entry] as Book;
				if (!book || book.isFolder()) {   // this book is lost
					const folder = this.getBookFolder(vid,path,this.root[vid]);
					book = new Book(folder,vid,path,name,ext,bid,visual,true);
					this.bookMap[entry] = book;
				}
				
				book.loadBookData(meta);
				this.bookIdMap[bid] = book;
			}

			// FIXME: what if some of bid are deleted??
		}
	}

	private async loadBookVault(vid: string) {
		const vaultPath = this.getBookVaultPath(vid);
		const vaultName = this.getBookVaultName(vid) || utils.getDirName(vaultPath);
		if (!await utils.isFolderExists(vaultPath)) { // TODO: virtual vault
			new Notice(`书库“${vaultName}(${vid}):${vaultPath}”不存在`); 
			return;
		}		


		if (!this.root[vid]) {
			this.root[vid] = new BookFolder(null,vid,vaultName,null);	
		}
		
		return this.walkBookVault(vid,vaultPath,"",this.root[vid],this.bookMap,this.settings.validBookExts);
	}

	private async loadAllBookVaults() {


		new Notice("书库加载中...");

		// load book file
		for(const vid in this.getCurrentDeviceSetting().bookVaultPaths) {
			await this.loadBookVault(vid); //FIXME: continue if path is empty??
		}

		await this.loadBookVault(OB_BOOKVAULT_ID);

		// load book data
		await this.loadAllBookData();

		new Notice("书库加载完成");
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
