import {debounce, loadMathJax, loadPrism, MarkdownView, Menu, normalizePath, Notice,ObsidianProtocolData,Platform,Plugin, TAbstractFile, TFile, TFolder, ViewCreator} from "obsidian";
import { around } from "monkey-around";

import { BookMasterSettings,DEFAULT_SETTINGS,DeviceSetting,DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { OB_BOOKVAULT_ID, supportBookExts } from "./constants";
import { AbstractBook, Book, BookFolder, BookStatus, BookTreeSortType } from "./Book";
import { BookExplorer, VIEW_TYPE_BOOK_EXPLORER } from "./view/BookExplorer";
import BasicBookSettingModal from "./view/BasicBookSettingModal";
import BookSuggestModal from "./view/BookSuggestModal";
import { BookProject, VIEW_TYPE_BOOK_PROJECT } from "./view/BookProject";
import { BookView, VIEW_TYPE_BOOK_VIEW } from "./view/BookView";
import {BookMasterSettingTab} from "./view/BookMasterSettingTab"
import { RecentBookView, VIEW_TYPE_RECENT_BOOKS } from "./view/RecentBookView";
import RelocateBookModal from "./view/RelocateBookModal";

export default class BookMasterPlugin extends Plugin {
	settings: BookMasterSettings;
	root: {[vid:string]:BookFolder};
	dispTree: BookFolder; // FIXME:parent of book item in dispTree is wrong

	bookMap: {[path:string]:AbstractBook} = {};
	bookIdMap: {[bid:string]:Book} = {};

	currentBookProjectFile: TFile;
	currentBookProjectBooks: BookFolder;

	bookVaultLoading: boolean;

	recentBooks: BookFolder;
	debounceSaveRecentBooks: any;
	
	async onload() {
		await this.loadSettings();
		this.recentBooks = new BookFolder(null,null,"RecentBook","");

		this.app.workspace.onLayoutReady(() => {
			this.loadAllBookVaults(null,true).then(()=>{
				this.updateDispTree();
				this.loadRecentBooks();
				new Notice("书库加载完成");
			});

		})

		this.addRibbonIcon("library","BookExplorer",(evt) => {
			this.activateView(VIEW_TYPE_BOOK_EXPLORER,"left");
			// this.activateView(VIEW_TYPE_BOOK_VIEW,"center");
		});

		this.addCommand({
			id: "bm-search-book",
			name: "Search Book",
			checkCallback: (checking) => {
				const tree = this.root[this.settings.currentBookVault];
				if (checking) {
					return Boolean(tree);
				} else {
					new BookSuggestModal(this.app, this,tree).open();
					return true;
				}
			}

		});

		this.addCommand({
			id: "bm-open-recent-books-view",
			name: "Open Recent Books View",
			callback: () => {
				this.activateView(VIEW_TYPE_RECENT_BOOKS,"left");
			}
		});



		this.registerBookProject();
		this.registerProtocalHandler();

		this.safeRegisterView(VIEW_TYPE_BOOK_EXPLORER,leaf => new BookExplorer(leaf,this));
		this.safeRegisterView(VIEW_TYPE_BOOK_PROJECT,leaf => new BookProject(leaf,this));
		this.safeRegisterView(VIEW_TYPE_BOOK_VIEW,leaf => new BookView(leaf,this));
		this.safeRegisterView(VIEW_TYPE_RECENT_BOOKS,leaf => new RecentBookView(leaf,this));
		this.addSettingTab(new BookMasterSettingTab(this.app, this));

		this.debounceSaveRecentBooks = debounce(() => {
			this.saveRecentBooks()
		},2000,true);
		
	}

	onunload() {
	}

	//#region common
	// register view safely
	private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

	async activateView(type: string, dir?: string, split?: boolean, newPanel?: boolean) {

		var leaf;
		if (this.app.workspace.getLeavesOfType(type).length == 0 || newPanel) { // not exists, create new one,
			if (dir === "left") {
				leaf = this.app.workspace.getLeftLeaf(split);
			} else if (dir === "right") {
				leaf = this.app.workspace.getRightLeaf(split);
			} else {
				leaf = this.app.workspace.getLeaf(split && !(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			}
			await leaf.setViewState({
				type: type,
				active: true,
			});
		} else {
			// TODO: activate one
			const view = this.app.workspace.getActiveViewOfType(BookView);
			console.log(view);
			if (view) {
				leaf = view.leaf;
			} else {
				leaf = this.app.workspace.getLeavesOfType(type)[0];
			}
		}

		this.app.workspace.revealLeaf(leaf);

		return leaf.view;
	}

	tryInsertTextToActiveView(content: string) {
		if (this.app.workspace.activeLeaf.view.getViewType() === "markdown") { // insert to markdown
			(this.app.workspace.activeLeaf.view as MarkdownView).editor.replaceSelection(content);

		} else {
			new Notice("请先激活目标Markdown窗口");
		}
	}

	registerProtocalHandler() {
		const self = this;
		const obProtocalHandler: any = {
			// "annotation": function(params: ObsidianProtocolData) {
			// 	const bid = params.bid;
			// 	const aid = params.aid;
			// 	if (bid && aid) {
			// 		self.getBookById(bid).then((book) => {
			// 			self.openBook(book);
			// 		})
			// 	}

			// 	const annotBook = self.decodeBookFromPath(params["book"]);
			// 	console.log("anotBook:",annotBook);
			// 	if (annotId && annotBook) {
			// 		// TODO:还需要支持?
			// 		if (self.isForceOpenBySystem(annotBook)) {
			// 			self.openBookBySystem(annotBook);
			// 		} else {
			// 			self.showAnnotationById(annotBook,annotId);
			// 		}
			// 	} else {
			// 		new Notice("标注链接参数错误");
			// 	}
			"open-book": function(params: ObsidianProtocolData) {

				if (params.fullpath) {
					self.getBookByFullPath(params.fullpath).then((book) => {
						const state = {
							aid: params.aid,
							page: params.page, // TODO: currently support pdf only
						};
						self.openBook(book,false,state);
					}).catch((err) => {
						new Notice(err);
					});
					
				}
				else if (params.bid) {
					self.getBookById(params.bid).then((book) => {
						const state = {
							aid: params.aid,
							page: params.page, // TODO: currently support pdf only
						};
						self.openBook(book,false,state);
					}).catch((err) => {
						new Notice(err);
					});
				}
			},
			"update-book-explorer": function(params: ObsidianProtocolData) {
				self.updateDispTree();
			}
		}

		this.registerObsidianProtocolHandler("bookmaster", (params) => {
			if (obProtocalHandler[params["type"]]) {
				obProtocalHandler[params["type"]](params);				
			} else {
				new Notice("[bookmaster]不支持的协议类型："+params["type"]);
			}
		});

	
	}

	private async loadRecentBooks() {
		this.recentBooks.children = []

		const content = await utils.safeReadObFile(normalizePath(this.settings.dataPath + "/recent.md"));
		if (!content) return;

		const r = /\[.*\]\((.*)\)/g 
		var item = null;
		do {
			item = r.exec(content)?.[1];
			if (!item) continue;
			const url = new URL(item);
			if (!url) continue;
			const bid = url.searchParams.get("bid");
			if (!url) continue;
			const book = await this.getBookById(bid);
			if (book) {
				this.recentBooks.push(book);
			}	
		} while(item)
	}

	private async saveRecentBooks() {
		var content = "";
		for (var i = 0; i !== this.recentBooks.children.length;i++) {
			const book = this.recentBooks.children[i] as Book;
			content += `- [${book.meta.title||book.name}](obsidian://bookmaster?type=open-book&bid=${book.bid})\r\n`;
		}
		return utils.safeWriteObFile(normalizePath(this.settings.dataPath + "/recent.md"),content,true);
	}

	resetRecentBooks() {
		this.recentBooks.children = [];
		this.debounceSaveRecentBooks();
	}
	removeRecentBook(book: Book) {
		this.recentBooks.children.remove(book);
		this.debounceSaveRecentBooks();
	}



	private async appendRecentBook(book: Book) {
		const ind = this.recentBooks.children.indexOf(book);
		if (ind == 0) return;
		else if (ind > 0) {
			this.recentBooks.children.splice(ind,1);
		} else if (this.recentBooks.children.length >= this.settings.recentBookNumberLimit) {
			this.recentBooks.children.pop();
		}
		this.recentBooks.children.splice(0,0,book);
		this.debounceSaveRecentBooks();
	}

	//#endregion

	//#region BookProject
	private isProjectFile(file: TFile) {
		return file && (utils.getPropertyValue(file, "bookmaster-plugin") || utils.getPropertyValue(file,"bm-books"));
	}

	private searchProjectFile(f: TFile) {
		if (this.isProjectFile(f)) {
			return f;
		}
		if (!f.parent.name) {
			return null;
		}
		const folderFilePath = normalizePath(f.parent.path + `/${f.parent.name}.md`);
		const folderFile = this.app.vault.getAbstractFileByPath(folderFilePath) as TFile
		if (folderFile && this.isProjectFile(folderFile)) {
			return folderFile;
		} else {
			return null;
		}
	}

	async updateBookProject() {
		// TODO: project file is deleted
		if (!this.currentBookProjectFile) {
			new Notice("没有设置工程文件");
			return
		}
		const projectName = utils.getPropertyValue(this.currentBookProjectFile, "bm-name")  || this.currentBookProjectFile.basename
		if (!this.currentBookProjectBooks) {
			this.currentBookProjectBooks = new BookFolder(null,null,projectName,null,);
		} else {
			this.currentBookProjectBooks.name = projectName;
			this.currentBookProjectBooks.removeAll();
		}
		
		let books = utils.getPropertyValue(this.currentBookProjectFile, "bm-books");
		if (!books) return;

		if (typeof books === "string") books = [books];

		for (let i = 0; i < books.length; i++) {
			const regIdPath = /[a-zA-Z0-9]{16}/;
			const IdPathGroup = regIdPath.exec(books[i]);
			if (IdPathGroup) {
				const book = await this.getBookById(IdPathGroup[0]);
				if (book) {
					this.currentBookProjectBooks.push(book);
				}
				continue;
			} 

			const regUrl = /^\[(.*)\]\((https?:\/\/[\w\-_]+(?:\.[\w\-_]+)+[\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?\)$/
			const urlGroup = regUrl.exec(books[i]);
			if (urlGroup) {
				const book = new Book(null,null,urlGroup[2],urlGroup[1],"url",null);
				this.currentBookProjectBooks.push(book);
				continue;
			}
			

		}
	}

	private async insertBookToProjectFile(book: Book,file: TFile) {
	
		return Promise.all([this.getBookIdPath(book),this.app.vault.read(file)]).then((value) => {
			const idpath = value[0];
			const content = value[1];

			const rYaml = /^(---\r?\n[\s\S]*\r?\n)---\r?\n/;
			const r = /(.*):(.*)\r?\n((?:- .*)\r?\n)*/g;
			const regIdPath = /[a-zA-Z0-9]{16}/;
			const gYaml = rYaml.exec(content)
			const yaml = gYaml?.[0];
			var result = null;
			if (yaml) {
				const gi = yaml.matchAll(r);
				for (var val = gi.next().value; val; val = gi.next().value) {
					var newYaml = null;
					const idSet = new Set<string>();

					if (val[1] === "bm-books") {
						if (val[2]) {
							newYaml = yaml.replace(val[0],`bm-books:\n- ${val[2]}\n- ${idpath}`)
						} else {
							newYaml = yaml.replace(val[0],val[0]+`- ${idpath}\n`);
						}
						result = content.replace(yaml,newYaml);
						break;
					}
				}
	
				if (!result) {
					result = content.replace(yaml,gYaml[1]+`bm-books:\n- ${idpath}\n---\n`)
				}
	
			} else {
				result = `---\nbm-books:\n- ${idpath}\n---\n` + content;
	
			}
	
			if (result) {
				return this.app.vault.modify(file,result);
			}

		});


		


	}

	private async openBookInProject() {
		// FIXME: need update?
		return this.updateBookProject().then(() => {
			const count = this.currentBookProjectBooks.children.length;
			if (count === 1) {
				this.openBook(this.currentBookProjectBooks.children[0] as Book);
			} else if (count > 0) {
				new BookSuggestModal(this.app, this, this.currentBookProjectBooks).open();
			} else {
				new Notice("当前工程没有文件");
			}
		});
	}

	private registerBookProject() {
		const self = this;
		// add item in more options
		this.register(
			around(MarkdownView.prototype, {
				onMoreOptionsMenu(next) {
					return function (menu: Menu) {
						// book meta file
						if (utils.getPropertyValue(this.file,"bm-meta")) { 
							const meta = self.app.metadataCache.getFileCache(this.file)?.frontmatter;
							const {vid,bid} = meta;
							if (vid && bid) {
								menu.addItem((item) => {
									item.setTitle("Open This Book").setIcon("popup-open") .onClick(() => {	
										self.getBookById(bid).then((book) => {
											self.openBook(book);
										}).catch((reason) => {
											new Notice("cant get this book:\n"+reason);
										});
									});
								});	
								menu.addItem((item) => {
									item.setTitle("基本设置").setIcon("gear").onClick((evt) => {	
										self.getBookById(bid).then((book) => {
											new BasicBookSettingModal(self.app,self,book,this.leaf.view.contentEl.getBoundingClientRect()).open();
										});
									});
								});	
							}

							menu.addSeparator();
						} else {


							const projFile = self.searchProjectFile(this.file);
							if (projFile) {
								menu.addItem((item) => {
									item.setTitle("Open Book Project").onClick(() => {
										self.currentBookProjectFile = projFile;
										self.updateBookProject().then(() => {
											self.activateView(VIEW_TYPE_BOOK_PROJECT, "right");
										});
									});
								});

								menu.addItem((item) => {
									item.setTitle("Open Book In Project").onClick(() => {
										self.currentBookProjectFile = projFile;
										self.openBookInProject();
									});
								});
								menu.addSeparator();
							}
						}
						return next.call(this, menu);
					};
				},
			})
		);	

		// open-book-from-meta-file
		this.addCommand({
			id: 'open-book-from-meta-file',
			name: 'Open This Book',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!markdownView || !markdownView.file || !utils.getPropertyValue(markdownView.file,"bm-meta")) return  false;

				const meta = self.app.metadataCache.getFileCache(markdownView.file)?.frontmatter;
				const {vid,bid} = meta;
				if (vid && bid) {
					if (!checking) {
						self.getBookById(bid).then((book) => {
							self.openBook(book);
						}).catch((reason) => {
							new Notice("cant get this book:\n"+reason);
						});
					}
	
					return true;
				} else {
					return false;
				}

		
			}
		});

		// open-book-project-view
		this.addCommand({
			id: 'open-book-project-view',
			name: 'Open Book Project View',
			checkCallback: (checking: boolean) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!markdownView || !markdownView.file) return  false;
				
				const projFile = self.searchProjectFile(markdownView.file);

				if (!this.currentBookProjectFile && !projFile ) // no project file
					return false;

				if (!checking) {
					if (projFile) {	// need update project
						self.currentBookProjectFile = projFile;
					}
					self.updateBookProject().then(() => {
						self.activateView(VIEW_TYPE_BOOK_PROJECT, "right");
					});
				}

				return true;
			}
		});

		// open-book-in-project
		this.addCommand({
			id: 'open-book-in-project',
			name: 'Open Book In Project',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!markdownView || !markdownView.file) return  false;
				
				var projFile = this.currentBookProjectFile; // use current project first
				if (!projFile) {
					projFile = self.searchProjectFile(markdownView.file);
				}
				if (!projFile) return false; // no project file

				if (!checking) {
					if (!self.currentBookProjectFile) {
						self.currentBookProjectFile = projFile;
					}
					self.openBookInProject();
				}

				return true;
			} 
			
		});

		// update book project when file is changed
		this.app.metadataCache.on("changed",(file,data,cache) => {
			if (this.currentBookProjectFile && this.currentBookProjectFile == file && this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_PROJECT).length > 0 ) {
				this.updateBookProject();
			}
		})
	}
	//#endregion


	//#region BookVault
	getBookVaultPath(vid: string) {
		if (vid === OB_BOOKVAULT_ID) {
			return (this.app.vault.adapter as any).basePath;
		} else {
			const vaultPath = this.getCurrentDeviceSetting().bookVaultPaths[vid];
			if (!vaultPath) return;
			if (vaultPath.startsWith("@")) {
				return (this.app.vault.adapter as any).basePath + vaultPath.substring(1);
			} else {
				return vaultPath;
			}
		}
	}
	
	private getBookVaultName(vid: string) {
		if (vid === OB_BOOKVAULT_ID) {
			return this.app.vault.getName();
		} else {
			return this.settings.bookVaultNames[vid] || utils.getDirName(this.getBookVaultPath(vid));
		}
	}
	
	getCurrentBookVault() {
		return this.settings.currentBookVault;
	}
	// FIXME: data file not ready
	private async loadAllBookData() {
		const dataFolder = this.app.vault.getAbstractFileByPath(this.getBookDataPath()) as TFolder;
		if (!dataFolder || !(dataFolder instanceof TFolder)) return;

		for(var i = 0 ;i < dataFolder.children.length; i++) {
			const file = dataFolder.children[i];
			if (!(file instanceof TFile)) continue;
			const meta = await this.app.metadataCache.getFileCache(file as TFile).frontmatter;
			if (!meta || !meta["bm-meta"]) {
				new Notice("配置文件错误:"+file.name,0)
				continue;
			}
			
			const {vid,bid,path,name,ext,visual} = meta;
			if (!vid || !bid)continue; // FIXME: check path?

			const entry = `${vid}:${path}`;
			var book = this.bookIdMap[bid];
			if (book) { // old data file
				// move book when change vid or path manually, which should not happen
				if (book.vid !== vid || book.path !== path) { 
					book.parent.children.remove(book);
					book.vid = vid;
					book.path = path;
					if (this.root[vid]) {
						const folder = this.getBookFolder(vid,book.path,this.root[vid]) // exist root[vid]?
						book.parent = folder;
						folder.push(book);
					}
				}

				book.lost = !Boolean(this.bookMap[entry])	// update book lost flag
				// FIXME: need reload book data??
			} else if (this.root[vid]) { // new book data file
				book = this.bookMap[entry] as Book;
				if (!book || book.isFolder()) {   // this book is lost
					const folder = this.getBookFolder(vid,path,this.root[vid]);
					book = new Book(folder,vid,path,name,ext,bid,visual,true);
					folder.push(book);
				}				
				this.bookIdMap[bid] = book;
			} else { 
				console.warn("unvalid data file(vid):",meta);
				continue;
			}

			book.loadBookData(meta); // FIXME: always load book
			// FIXME: data file is deleted manualy??
		}
	}

	// TODO: too slow
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

			if (await utils.isFolder(utils.normalizePath(vaultPath,path))) { // book folder
				if (name.startsWith(".")) continue;

				var folder = map[entry];
				if (!folder || !folder.isFolder()) {		// new folder
					folder = new BookFolder(root,vid,name,path);
					root.push(folder);
					map[entry] = folder;	
				}

				folder._existsFlag = true;
				await this.walkBookVault(vid,vaultPath,path,folder as BookFolder,map,validBookExts);
			} else { // book
				const ext = utils.getExtName(path);
				if (!utils.isValidBook(name,ext,validBookExts)) continue;

				var book = map[entry] as Book;
				if (!book || book.isFolder()) {	// new file
					const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
					book = new Book(root,vid, path,bookname,ext);
					book.loadBookData(null); // init book data
					root.push(book);
					map[entry] = book;
				} else if (!book.lost) { // file is back
					book.lost = false;
				}

				book._existsFlag = true;
			}
		}

		// if the test flag is still false, then it has been deleted
		for (var i = 0; i < root.children.length; i++) {  
			const abs = root.children[i];
			if (abs._existsFlag || abs.lost) continue;	// exist or already lost

			if (!abs.isFolder() && (abs as Book).bid) { // book is lost
				(abs as Book).lost = true;
			} else {
				const entry = `${abs.vid}:${abs.path}`;
				delete map[entry];
				root.children.splice(i,1);
	
				if (abs.isFolder()) {
					utils.cleanFolderInMap(abs as BookFolder,map);
				}
			}
		}
	}


	async removeBookVault(vid: string) {
		delete this.settings.bookVaultNames[vid];
		delete this.getCurrentDeviceSetting().bookVaultPaths[vid];
		if (this.root[vid]) {// FIXME: remove all book of this vault??
			for (var key in this.bookMap) {
				if (key.startsWith(vid)) {
					const book = this.bookMap[key];
					if (!book.isFolder() && (book as Book).bid) {
						(book as Book).lost = true;
					} else {
						delete this.bookMap[key];
					}
				}
			}
			delete this.root[vid];

			if (this.settings.currentBookVault === vid) {
				this.updateDispTree();
			}
		}

		await this.saveSettings();
	}

	async switchBookVault(vid: string) {
		this.settings.currentBookVault = vid;
		await this.saveSettings();
		return this.updateDispTree();
	}

	private async loadBookVault(vid: string) {
		const vaultPath = this.getBookVaultPath(vid);

		if (!vaultPath) {
			this.removeBookVault(vid);
			return Promise.reject("empty vault path");
		}

		const vaultName = this.getBookVaultName(vid);
		if (!await utils.isFolderExists(vaultPath)) { // TODO: virtual vault
			const err = `书库“${vaultName}(${vid}):${vaultPath}”不存在`;
			return Promise.reject(err);
		}		


		if (!this.root[vid]) {
			this.root[vid] = new BookFolder(null,vid,vaultName,null);	
		}
		
		return this.walkBookVault(vid,vaultPath,"",this.root[vid],this.bookMap,this.settings.showBookExts);
	}

	async loadAllBookVaults(vid: string = null, loadData: boolean = false) {

		if (this.bookVaultLoading) {
			await this.waitBookVaultLoading();
			return;
		}

		this.bookVaultLoading = true;

		new Notice("书库加载中...");

		if (!this.root) {	// first load
			this.root = {};
		}

		if (vid) { //load this vault only
			await this.loadBookVault(vid).then(() => {
				if (loadData) {
					return this.loadAllBookData();
				}
			}).catch((err) => {
				new Notice(err);
			});

		} else {

			// load book files
			for(const vid in this.getCurrentDeviceSetting().bookVaultPaths) {
				await this.loadBookVault(vid).catch((err) => {
					new Notice(err);
				});
			}

			// await this.loadBookVault(OB_BOOKVAULT_ID); // TODO: don't load this vault

			// load book data
			if (loadData) {
				await this.loadAllBookData();
			}

			console.log("book vaults root:",this.root,this.bookIdMap);
		}

		this.bookVaultLoading = false;
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
	
	async updateDispTree() {

		var vid = this.getCurrentBookVault();
		await this.waitBookVaultLoading();
		
		// TODO: avoid try twice
		if (!this.root[vid] && this.getCurrentDeviceSetting().bookVaultPaths[vid]) { // try again
			console.log(`try book vault ${vid}:${this.getCurrentDeviceSetting().bookVaultPaths[vid]} again`);
			await this.loadAllBookVaults(vid);
		}
		if (!this.root[vid]) {	//switch current book vault
			const rawVaultPath = this.getBookVaultPath(vid);
			if (rawVaultPath !== undefined) { // not deleted
				new Notice(`当前书库(${vid})不存在:\n`+rawVaultPath); // TODO
			}

			vid = null;
			for (var v in this.root) {
				if (v !== "99") {
					vid = v;
					if (rawVaultPath !== undefined) {
						new Notice("切换为书库:\n"+this.getBookVaultPath(vid)); 
					}
					break;
				}
			}
	
			if (!vid) {
				return Promise.reject("没有可用书库");
			} else {
				this.settings.currentBookVault = vid;
				await this.saveSettings();
			}
		}

		


		const rawTree = this.root[vid];
		if (!this.dispTree) {
			this.dispTree = new BookFolder(null,vid,this.getBookVaultName(vid),null);
		} else if (vid !== this.dispTree.vid) {
			this.dispTree.vid = vid;
			this.dispTree.name = this.getBookVaultName(vid);
		}

		// clear
		this.dispTree.removeAll();

		// built
		if (this.settings.bookTreeSortType === BookTreeSortType.PATH) {
			utils.walkTreeByFolder(this.root[vid],this.dispTree); // TODO: check setup
		} else {
			const map: Map<string,BookFolder> = new Map();
			const unknownFolder = new BookFolder(this.dispTree,vid,"unknown","unknown");
			map.set("unknown", unknownFolder);
			this.dispTree.push(unknownFolder);
		
			if (this.settings.bookTreeSortType === BookTreeSortType.TAG) {
				utils.walkTreeByTag(map,rawTree,this.dispTree);
			} else if (this.settings.bookTreeSortType === BookTreeSortType.AUTHOR) {
				utils.walkTreeByAuthor(map,rawTree,this.dispTree);
			} else if (this.settings.bookTreeSortType === BookTreeSortType.PUBLISH_YEAR) {
				utils.walkTreeByPublishYear(map,rawTree,this.dispTree);
			}
		}

		utils.accumulateTreeCount(this.dispTree);
		utils.sortBookTree(this.dispTree,this.settings.bookTreeSortAsc);
	}

	//#endregion


	//#region Book

	private async getBookByPath(vid: string, path: string) {
		await this.waitBookVaultLoading();

		const entry = `${vid}:${path}`;
		const book = this.bookMap[entry];
		if (book) {
			return book
		} else {
			return Promise.reject("cant find book: "+entry);
		}
	}

	async getBookByFullPath(fullpath: string): Promise<Book> {

		await this.waitBookVaultLoading();

		for (var vid in this.root) {
			const vaultPath = this.getBookVaultPath(vid);
			if (fullpath.startsWith(vaultPath)) {
				const path = fullpath.substring(vaultPath.length).replace(/\\/g,"/");
				const entry = `${vid}:${path}`;
				const book = this.bookMap[entry] as Book;
				return book;
			}
		}
	}

	async waitBookVaultLoading(): Promise<void>{
		const self = this;
		if (!this.root) {
			return this.loadAllBookVaults(null,true);
		} else {
			return new Promise((resolve) => {
				const wait = () => {
					if (self.bookVaultLoading) {
						setTimeout(wait,100);
					} else {
						resolve();
	
					}
				}	
				wait();
			});
		}
		
	}

	async getBookById(bid: string) {
		await this.waitBookVaultLoading();		
		const book = this.bookIdMap[bid];
		if (book) {
			return book
		} else {
			return Promise.reject("cant find bid: "+bid);
		}
	}

	getBookFullPath(book: Book) {
		// FIXME: url path

		return utils.normalizePath(this.getBookVaultPath(book.vid),book.path);
	}

	getBookUrl(book: Book) {
		const fullpath = encodeURIComponent(this.getBookFullPath(book));
		if (Platform.isDesktop || Platform.isMacOS) {
			return "app://local/" + fullpath;
		} else if (Platform.isAndroidApp) {
			return "http://local" + fullpath;
		} else if (Platform.isIosApp) {
			return "capitor://local" + fullpath;
		}
		new Notice("未知系统,无法获取文件URL",0);
		return null
	}

	async getBookData(book: Book) {
		const path = this.getBookFullPath(book);
		return utils.readFile(path);
	}


	async saveBookAnnotations(bid: string, annotations: string) {
		return utils.safeWriteObFile(this.getBookAnnotationsFilePath(bid),annotations,true)
	}
	async saveBookAnnotationImage(bid: string, aid: string, data: Buffer, suffix?: string) {

		if (suffix) {
			suffix = "-" + suffix;
		} else {
			suffix = "";
		}
		const imageName = `${bid}-${aid}${suffix}.png`
		const path = this.getBookAnnotationImagesPath() + "/" + imageName;
		return utils.safeWriteObFile(path,data).then(() => {
			return imageName;
		});
	}

	async loadBookAnnotations(bid: string) {
		const path = this.getBookAnnotationsFilePath(bid);
		return utils.safeReadObFile(path);
	}


	private async getBookOpenLink(book: Book) {
		return this.getBookId(book).then((bid) => {
			return `obsidian://bookmaster?type=open-book&bid=${bid}`;
		});
	}

	private getBookDataFilePath(bid: string) {
		return this.getBookDataPath() + `/${bid}.md`;
	}
	private getBookAnnotationsFilePath(bid: string) {
		return this.getBookAnnotationsPath() + `/${bid}.xml`;
	}
	// private getBookAnnotationImageFilePath(bid: string, aid: string,suffix?: string) {
	// 	if (suffix) {
	// 		suffix = "-" + suffix;
	// 	} else {
	// 		suffix = "";
	// 	}
	// 	return this.getBookAnnotationImagesPath() + `/${bid}-${aid}${suffix}.png`;
	// }

	private async openBookDataFile(book: Book) {
		return this.getBookId(book).then((bid) => {
			return utils.openMdFileInObsidian(this.getBookDataFilePath(book.bid));
		})
	}

	private async getBookIdPath(book: Book) {
		return this.getBookId(book).then((bid) => {
			return `"${bid}:${book.meta.title || book.name}"`
		})
	}

	private relocateBook(book: Book) {
		new RelocateBookModal(this,book).open();
	}

	createBookContextMenu(menu: Menu, book: Book) {
		if (book.vid) {

			if (book.lost) {
				menu.addItem((item: any) =>
				item
					.setTitle("重定位文件")
					.setIcon("popup-open")
					.onClick(()=>{
						// TODO: relocate book
						this.relocateBook(book);
					})
				);
				menu.addSeparator();
			}

			menu.addItem((item: any) =>
			item
				.setTitle("基本设置")
				.setIcon("gear")
				.onClick(()=>{
					new BasicBookSettingModal(this.app,this,book).open();
				})
			);

			menu.addItem((item: any) =>
			item
				.setTitle("插入当前文件")
				.setIcon("gear")
				.onClick(()=>{
					const file = this.app.workspace.getActiveFile();

					if (file) {
						this.insertBookToProjectFile(book,file);
					} else {
						new Notice("请先激活一个文件")
					}

				})
			);




			menu.addItem((item) =>
			item
				.setTitle((book.meta.note ? "打开笔记" : "创建笔记") + "(todo)")
				.setIcon("pencil")
				.onClick(()=>{
					// this.createBookNote(book);
				})
			);
			menu.addSeparator();

			// TODO: icon
			const allStatus = [BookStatus.UNREAD,BookStatus.READING,BookStatus.FINISHED];
			const statusIcon = ["cross","clock","checkmark"]
			const statusName = ["未读","在读","已读"];
			const bookStatus = allStatus.includes(book.meta["status"]) ? book.meta["status"] : BookStatus.UNREAD;
			for (let ind in allStatus) {
				const status = allStatus[ind];
				if (bookStatus !== status) {
					menu.addItem((item) =>
					item
						.setTitle("设为"+statusName[ind])
						.setIcon(statusIcon[ind])
						.onClick(()=>{
							book.meta["status"] = status;
							this.saveBookData(book).then(() => {
								new Notice("设置成功");
							}).catch((reason)=>{
								new Notice("设置失败:\n"+reason);
							});
						})
					);
				}
			}
			menu.addSeparator();
			menu.addItem((item) =>
			item
				.setTitle("复制路径(ID:Title)")
				.setIcon("link")
				.onClick(()=>{
					this.getBookIdPath(book).then((path) => {
						navigator.clipboard.writeText(path);
					});
				})
			);
	
			menu.addItem((item) =>
			item
				.setTitle("复制Obsidian链接")
				.setIcon("link")
				.onClick(()=>{
					this.getBookOpenLink(book).then((link) => {
						navigator.clipboard.writeText(`[${book.meta.title || book.name}](${link})`);
					})
				})
			);

			menu.addItem((item) =>
			item
				.setTitle("引用(todo)")
				.setIcon("link")
				.onClick(()=>{
					// if (book.meta.citekey) {
					// 	navigator.clipboard.writeText(`[@${book.meta.citekey}]`);
					// } else {
					// 	new Notice("请先设置citekey");
					// }
				})
			);
			menu.addSeparator();
			menu.addItem((item: any) =>
			item
				.setTitle("打开设置文件")
				.setIcon("popup-open")
				.onClick(()=>{
					this.openBookDataFile(book);
				})
			);

			if (book.hasId()) {
				menu.addItem((item: any) =>
				item
					.setTitle("删除记录(todo)")
					.setIcon("trash")
					.onClick(()=>{
						// TODO: double check
						// const file = this.app.vault.getAbstractFileByPath(this.getBookManifestPath(book)) as TFile;
						// if (file) {
						// 	this.app.vault.delete(file.parent,true).then(() => {
						// 		// this.updateBookMeta(book); read from file cache work, need to wait for some second?
						// 	})
						// }
					})
				);	
			}

			menu.addItem((item: any) =>
				item
					.setTitle("删除文件(todo)")
					.setIcon("trash")
					.onClick(()=>{
						// TODO: double check
						// const file = this.app.vault.getAbstractFileByPath(this.getBookManifestPath(book)) as TFile;
						// if (file) {
						// 	this.app.vault.delete(file.parent,true);
						// }
						// this.updateBookMeta(book);
					})
				);
			
		}

		if (!book.lost) {
			menu.addSeparator();
			menu.addItem((item: any) =>
			item
				.setTitle("使用默认应用打开")
				.setIcon("popup-open")
				.onClick(()=>{
					this.openBookBySystem(book);
				})
			);
				

			if (book.vid && !book.visual && !Platform.isMobile) {
				menu.addItem((item: any) =>
				item
					.setTitle("在系统资源管理器中显示")
					.setIcon("popup-open")
					.onClick(()=>{
						// FIXME: http?
						utils.showBookLocationInSystem(this.getBookFullPath(book));
						
					})
				)
			};
	
		}
	}

	// make sure folder has real path
	createBookFolderContextMenu(menu: Menu, folder: BookFolder) {

		if (!folder.vid) return;


		if (this.settings.bookTreeSortType == BookTreeSortType.PATH && !Platform.isMobile) {
			menu.addItem((item) =>
			item
				.setTitle("在系统资源管理器中显示")
				.setIcon("popup-open")
				.onClick(()=>{
					// FIXME: http?
					if (folder.path) {
						utils.showBookLocationInSystem(
							utils.normalizePath(this.getBookVaultPath(folder.vid),folder.path),
						);
					}					
				})
			)
		}
		
	}


	async openBookBySystem(book: Book, state?: any) {
		if (book.ext === "url") {
			if (Platform.isMobile) {
				(this.app as any).openWithDefaultApp(book.path);
			} else {
				window.open(book.path);
			}
		} else {
			const fullpath = this.getBookFullPath(book);
			if (Platform.isMobile) {
				// TODO: http?
				const relPath = utils.getMobileRelativePath(fullpath);
				(this.app as any).openWithDefaultApp(relPath);
			} else {
				window.open("file:///"+fullpath);
			}
		}
	}

	async openBook(book: Book, newPanel: boolean=false, state?: any) {
		if (book.lost) {
			// TODO: fix lost book
			new Notice("文件丢失");
			return;
		}

		if (this.settings.openAllBookWithDefaultApp || this.settings.openBookExtsWithDefaultApp.includes(book.ext)) {
			this.openBookBySystem(book);
		} else if (supportBookExts.includes(book.ext)) { // TODO: support exts

			if (book.tab) { // already opened
				this.app.workspace.revealLeaf(book.tab.bookview.leaf);
				book.tab.bookview.showBookTab(book.tab);
			} else {
	
				return this.activateView(VIEW_TYPE_BOOK_VIEW,"center",true,newPanel).then((view: BookView) => {
					return this.getBookId(book).then((bid) => {
						this.appendRecentBook(book);
						return view.openBook(bid,state);
					});
				});		
				
			}
		} else {
			this.openBookBySystem(book);
		}


		// if open by system
		if (book.vid) {
			return this.getBookId(book).then((bid) => {
				this.appendRecentBook(book);
			});
		}
	}



	// save book data safely
	async saveBookData(book: Book) {
		if (!book.hasId()) {
			const bid = book.getId();
			this.bookIdMap[bid] = book;
		}
		return book.saveBookData(this.getBookDataPath());
	}

	// get book id safely
	async getBookId(book: Book) {
		if (!book.hasId()) {
			const bid = book.getId();
			// new Notice("创建id:"+bid);
			this.bookIdMap[bid] = book;
			return this.saveBookData(book).then(() => {
				return bid;
			});
		}
		return book.getId();
	}

	//#endregion


	//#region settings
	getCurrentDeviceSetting() {
		return this.settings.deviceSetting[utils.appId];
	}

	private getBookDataPath() {
		return this.settings.dataPath + "/book-data";
	}
	private getBookAnnotationsPath() {
		return this.settings.dataPath + "/book-annotations";
	}
	private getBookAnnotationImagesPath() {
		return this.settings.dataPath + "/book-images";
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

	//#endregion
}
