

import { debounce, Notice, Platform, TFile, TFolder, WorkspaceLeaf } from "obsidian";
import { reactive } from "vue";
import { AbstractBook, Book, BookFolder, BookFolderType, BookTreeSortType } from "./Book";
import { supportBookExts } from "./constants";
import BookMasterPlugin from "./main";
import * as utils from './utils'
// import { VIEW_TYPE_BOOK_EXPLORER } from "./view/BookExplorer";
// import { BookView, VIEW_TYPE_BOOK_VIEW } from "./view/BookView";

export const MAIN_BOOKVAULT_ID = "00";
export const OB_BOOKVAULT_ID = "99";

export class BookVaultManager {
    plugin: BookMasterPlugin;

	bookMap: Map<string,AbstractBook>;
	bookIdMap: Map<string, Book>;

	root: Map<string, BookFolder>
	bookDispTree: BookFolder;

	bookVaultWatcher: Map<string, any>;


    constructor(plugin: BookMasterPlugin) {
        this.plugin = plugin;
		this.root = reactive(new Map());
		this.bookMap = new Map();
		this.bookIdMap = new Map();
		this.bookDispTree = reactive(new BookFolder(null,"", "", ""));
		this.bookVaultWatcher = new Map();


		// watch data folder
		const handle = this.plugin.app.vault.on("delete",(file: TFile) => {

			if (file.path === this.getBookDataPath()) { // TODO: remove all
				this.bookIdMap.forEach((book, id) => {
					book.loadBookData(null);
				});
			} else if (file.path.startsWith(this.getBookDataPath())) {
				const bid = file.basename;
				const book = this.getBookById(bid);
				if (book) {
					book.bid = null;
					if (book.lost) {
						this.removeBook(book);
						if (this.getCurrentBookVaultId() === book.vid) {
							this.updateBookDispTree();
						}
					} else {
						book.loadBookData(null);
						new Notice(`data of book ${this.getBookNamedPath(book)} is reset `)	
					}
				}
			}
		})

		this.plugin.register(() => {
			this.plugin.app.vault.offref(handle);
			for (var vid in this.bookVaultWatcher) {
				this.bookVaultWatcher.get(vid).close();
			}
		})
    }

	getBookById(bid: string) {
		return this.bookIdMap.get(bid);
	}
	getBookByPath(vid: string, path: string) {
		return this.bookMap.get(`${vid}:${path}`);
	}
	getBookByFullPath(fullpath: string) {

		// await this.waitBookVaultLoading();

		for (var vid in this.root) {
			const vaultPath = this.getBookVaultPath(vid);
			if (fullpath.startsWith(vaultPath)) {
				const path = fullpath.substring(vaultPath.length).replace(/\\/g,"/");
				const entry = `${vid}:${path}`;
				const book = this.bookMap.get(entry) as Book;
				return book;
			}
		}
	}

	async getBookOpenLink(book: Book) {
		return this.getBookIdSafely(book).then((bid) => {
			return `obsidian://bookmaster?type=open-book&bid=${bid}`;
		});
	}

	async getBookIdSafely(book: Book) {
		if (!book.bid) {
			const bid = book.generateBid();
			await book.saveBookData(this.getBookDataPath());
			this.bookIdMap.set(bid, book);
		}
		return book.bid;
	}
	async getBookIdPath(book: Book) {
		return this.getBookIdSafely(book).then((id) => {
			return `${id}:${book.meta.title || book.name}`
		})
	}
	async saveBookDataSafely(book: Book) {

		if (!book.bid) {
			book.generateBid();
			this.bookIdMap.set(book.bid, book);
		}
		await book.saveBookData(this.getBookDataPath());
	}

	async openBookDataFile(book: Book) {
		return this.getBookIdSafely(book).then((bid) => {
			return utils.openMdFileInObsidian(this.getBookDataFilePath(book.bid));
		})
	}

	async loadBookAnnotations(bid: string) {
		const path = this.getBookAnnotationsFilePath(bid);
		return utils.safeReadObFile(path);
	}
	async saveBookAnnotations(bid: string, annotations: string) {
		return utils.safeWriteObFile(this.getBookAnnotationsFilePath(bid),annotations,true)
	}
	getBookAnnotationsFilePath(bid: string) {
		return this.getBookAnnotationsPath() + `/${bid}.xml`;
	}

	async saveBookAnnotationImage(bid: string, aid: string, data: ArrayBuffer, suffix?: string) {

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

	private getBookDataFilePath(bid: string) {
		return this.getBookDataPath() + `/${bid}.md`;
	}

	
	addBookVault(vid: string) {
		console.log("add book vault", vid);
		const rootFolder = reactive(new BookFolder(null,vid, this.getBookVaultName(vid),"/"));
		this.root.set(vid, rootFolder);
		this.bookMap.set(rootFolder.getEntry(), rootFolder);
		
		const id = (((1+Math.random())*0x10000)|0).toString(16).substring(1);
		// TODO: not alway work!!
		const debounceUpdateBookVault = debounce(() => {
			console.log(id, "book vault changed:",this.getBookVaultPath(vid));
			this.loadBookVault(vid).then(() => {
				return this.loadAllBookData().then(() => {
					if (this.getCurrentBookVaultId() === vid) {
						return this.updateBookDispTree();
					}
				});
			});
		},1500,true);

		const watcher = utils.app.vault.adapter.fs.watch(this.getBookVaultPath(vid),{recursive: true}, () => {
			debounceUpdateBookVault();
		});

		this.bookVaultWatcher.set(vid, watcher);

	}

	async modifyBookVault(vid: string, newName: string, newPath: string) {
		
		const debounceUpdateBookVault = debounce(() => {
			console.log("book vault changed:",this.getBookVaultPath(vid));
			this.loadBookVault(vid).then(() => {
				return this.loadAllBookData().then(() => {
					if (this.getCurrentBookVaultId() === vid) {
						return this.updateBookDispTree();
					}
				});
			});
		},1500,true);

		if (this.root.has(vid)) {
			if (newName !== this.getBookVaultName(vid)) {
				this.plugin.settings.bookVaultNames[vid] = newName;
				this.root.get(vid).name = newName;
			}
	
			if (newPath !== this.getBookVaultPath(vid)) {
				this.bookVaultWatcher.get(vid).close();
				const watcher = utils.app.vault.adapter.fs.watch(this.getBookVaultPath(vid),{recursive: true}, () => {
					debounceUpdateBookVault();
				});
				this.bookVaultWatcher.set(vid, watcher);
				this.plugin.getCurrentDeviceSetting().bookVaultPaths[vid] = newPath;
			}
		} else {
			const rootFolder = reactive(new BookFolder(null,vid, newName,"/"));
			this.root.set(vid, rootFolder);
			this.bookMap.set(rootFolder.getEntry(), rootFolder);

			this.plugin.settings.bookVaultNames[vid] = newName;
			this.plugin.getCurrentDeviceSetting().bookVaultPaths[vid] = newPath;

			const watcher = utils.app.vault.adapter.fs.watch(this.getBookVaultPath(vid),{recursive: true}, () => {
				debounceUpdateBookVault();
			});
			this.bookVaultWatcher.set(vid, watcher);
		}
		
		return this.plugin.saveSettings().then(() => {
			return this.plugin.bookVaultManager.update();
		});
	}


	removeBookVault(vid: string) {

		this.plugin.register(() => {
			this.bookVaultWatcher.get(vid).close();
		})

		if (this.getCurrentBookVaultId() === vid) {
			if (this.plugin.bookExplorer) {
				this.plugin.bookExplorer.leaf.detach();
			}
			this.plugin.settings.currentBookVault = "00";
		}

		this.root.delete(vid);
		this.bookMap.forEach((book, entry) => {
			if (entry.startsWith(vid)) {
				this.bookMap.delete(entry);
			}
		})
		
		this.bookIdMap.forEach((book, id) => {
			if (book.vid === vid) {
				this.bookIdMap.delete(id);
			}
		})

		
	}


	getCurrentBookVaultId() {
		return this.plugin.settings.currentBookVault;
	}
	getCurrentBookVault() {
		return this.root.get(this.getCurrentBookVaultId());
	}
	getBookVaultPath(vid: string) {
		if (vid === OB_BOOKVAULT_ID) {
			return (utils.app.vault.adapter as any).basePath;
		} else {
			const vaultPath = this.plugin.getCurrentDeviceSetting().bookVaultPaths[vid];
			if (!vaultPath) return;
			if (vaultPath.startsWith("@")) {
				return (utils.app.vault.adapter as any).basePath + vaultPath.substring(1);
			} else {
				return vaultPath;
			}
		}
	}
	getBookVaultName(vid: string) {
		if (vid === OB_BOOKVAULT_ID) {
			return utils.app.vault.getName();
		} else {
			return this.plugin.settings.bookVaultNames[vid] || utils.getFolderName(this.getBookVaultPath(vid));
		}
	}

    getBookDataPath() {
		return this.plugin.settings.dataPath + "/book-data";
	}
	getBookAnnotationsPath() {
		return this.plugin.settings.dataPath + "/book-annotations";
	}
	getBookAnnotationImagesPath() {
		return this.plugin.settings.dataPath + "/book-images";
	}
	getBookFullPath(book: AbstractBook) {
		// TODO: url path
		return utils.normalizePath(this.getBookVaultPath(book.vid),book.path);
	}

	getBookNamedPath(book: Book) {
		return this.getBookVaultName(book.vid) + book.path;
	}
	getMobileRelativePath(fullpath: string) {
		const basePath = (app.vault.adapter as any).basePath
		const b = basePath.split("/");
		const f = fullpath.split("/");
		for (var i = 0; i < b.length; i++) {
			if (b[i] !== f[i]) {
				const rel = "../".repeat(b.length-i) + f.slice(i).join("/");
				return rel;
			}
		}
		
		if (f.length > b.length) {
			return f.slice(b.length).join("/");
		} else {
			return null;
		}
	}
	async getBookContent(book: Book) {
		const path = this.getBookFullPath(book);
		return utils.readFile(path);
	}

	private isValidBook(bookname: string,ext: string) {
		return !bookname.startsWith("~$") && !bookname.startsWith(".") && this.plugin.settings.showBookExts.indexOf(ext) >= 0;
	}
	

	private sortBookTree(tree: BookFolder,asc: boolean,) {
		tree.children.sort((a:AbstractBook,b:AbstractBook)=> {
			if (a.isFolder() !== b.isFolder()) {
				if (a.isFolder()) return -1;
				else return 1;
			} else if (a.isFolder() && b.isFolder()) {
				if (a.name === "unknown") {
					return 1;
				} else if (b.name === "unknown") {
					return -1;
				}
				if (asc) {
					return a.name > b.name  ? 1 : -1;
				} else {
					return a.name < b.name  ? 1 : -1;
				}
			} else {
				// sort by title first!
				// TODO: sort by year when sort type is author??
				const na = (a as Book)?.meta.title || a.name;
				const nb = (b as Book)?.meta.title || b.name;
				if (asc) {
					return na > nb  ? 1 : -1;
				} else {
					return na < nb  ? 1 : -1;
				}
			}
			
		})
	
		for(var i = 0; i < tree.children.length; i++) {
			if (tree.children[i].isFolder()) {
				this.sortBookTree(tree.children[i] as BookFolder, asc);
			}
		}
	}
	private accumulateTreeCount(tree: BookFolder) {
		var count = 0;
		for(var i = 0; i < tree.children.length; i++) {
			const book = tree.children[i];
			if (book.isFolder()) {
				count += this.accumulateTreeCount(book as BookFolder);
			} else {
				count += 1;
			}
		}
		tree.count = count;
		return count;
	}
	private walkBookFolder(folder: BookFolder, callback: (book: AbstractBook)=>any, callOnFolder: boolean = false) {
		folder.children.forEach((item) => {
			if (item.isFolder()) {
				this.walkBookFolder(item as BookFolder,callback);
				if (callOnFolder) {
					callback(item);
				}
			} else {
				callback(item);
			}
		})
	}
	private getBookFolder(vid:string, path: string, rootFolder: BookFolder, map: Map<string,AbstractBook>) {
		const nodes = path.split("/"); // TODO: make sure path start with '/'
		var folder = rootFolder;		
		var p = `${vid}:`;				
	
		for(let i = 1; i < nodes.length; i++) {
			p += "/" + nodes[i];
			var f = map.get(p) as BookFolder;
			if (!f || !f.isFolder()) {
				f = reactive(new BookFolder(folder,vid,nodes[i],p));
				folder.push(f);
				map.set(p, f);
			}
			folder = f;
		}
		return folder;
	}

	private getBookFolderByTagPath(vid:string, path: string, rootFolder: BookFolder, map: Map<string,AbstractBook>) {
		const nodes = path.split("/"); // TODO: make sure path start with '/'
		var folder = rootFolder;		
		var p = "";				
	
		for(let i = 0; i < nodes.length; i++) {
			p += nodes[i];
			var f = map.get(p) as BookFolder;
			if (!f || !f.isFolder()) {
				f = reactive(new BookFolder(folder,vid,nodes[i],p,false,BookFolderType.TAG));
				folder.push(f);
				map.set(p, f);
			}
			p += "/";
			folder = f;
		}
		return folder;
	}
	private walkTreeByFolder(tree: BookFolder, result: BookFolder) {

		tree.children.forEach((book) => {			
			if (book.isFolder()) {
				const folder = reactive(new BookFolder(result,book.vid,book.name,book.path,book.lost)); // FIXME: book.lost??
				result.push(folder);
				this.walkTreeByFolder(book as BookFolder,folder);
			} else {
				result.push(book);
			}
		});
	}
	private walkTreeByTag(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {
		this.walkBookFolder(tree,(book: Book) => {
			const tags = new Set(book.meta.tags.map((t:string) => t.trim()));
			// if (tags.size) {
			// 	console.log(book.name, tags);
			// }
			if (tags.size) {
				tags.forEach((tag:string) => {
					if (!tag) return;
					var folder = map.get(tag);
					if (!folder) {
						folder = this.getBookFolderByTagPath(book.vid,tag,result,map);
					}
					folder.push(book);
				});
			} else {
				map.get("unknown").push(book);
			}
		});
	}
	private walkTreeByAuthor(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {

		this.walkBookFolder(tree,(book: Book) => {
			const authors = new Set(book.meta.authors.map((t:string) => t.trim()));
			if (authors.size) {
				authors.forEach((author:string) => {
					if (!author)return; 
					let folder = map.get(author);
					if (!folder) {
						folder = reactive(new BookFolder(result, book.vid,author,author));
						map.set(author,folder);
						result.push(folder);
					}
					folder.push(book);
				});
			} else {
				map.get("unknown").push(book);
			}
		});
	}
	private walkTreeByPublishYear(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {  
	
		this.walkBookFolder(tree,(book: Book) => {
			const date = String(book.meta.publish_date);
			if (date && /^\d{4}/.test(date)) {
				const year =  date.substring(0,4);
				let folder = map.get(year) as BookFolder;
				if (!folder) {
					folder = reactive(new BookFolder(result,book.vid,year,year));
					map.set(year,folder);
					result.push(folder);
				}
				folder.push(book);
			}  else {
				map.get("unknown").push(book);
			}          
	
	
		});
	}
	async updateBookDispTree() {
		const vid = this.getCurrentBookVaultId();
		this.bookDispTree.clear();

		if (vid !== this.bookDispTree.vid) {
			this.bookDispTree.vid = vid;
			this.bookDispTree.name = this.getBookVaultName(vid);
			this.bookDispTree.path = this.getBookVaultPath(vid);
		}

		const rawTree = this.root.get(vid);
		if (!rawTree) { // doesn't exists
			new Notice(`当前书库(${vid})不存在:\n`+this.bookDispTree.path); // TODO
			return;
		}

		// built
		if (this.plugin.settings.bookTreeSortType === BookTreeSortType.PATH) {
			this.walkTreeByFolder(rawTree,this.bookDispTree); // TODO: check setup
		} else {
			const map: Map<string,BookFolder> = new Map();
			const unknownFolder = reactive(new BookFolder(this.bookDispTree,vid,"unknown","unknown"));
			map.set("unknown", unknownFolder);
			this.bookDispTree.push(unknownFolder);
		
			if (this.plugin.settings.bookTreeSortType === BookTreeSortType.TAG) {
				unknownFolder.type = BookFolderType.TAG;
				this.walkTreeByTag(map,rawTree,this.bookDispTree);
			} else if (this.plugin.settings.bookTreeSortType === BookTreeSortType.AUTHOR) {
				unknownFolder.type = BookFolderType.AUTHOR;
				this.walkTreeByAuthor(map,rawTree,this.bookDispTree);
			} else if (this.plugin.settings.bookTreeSortType === BookTreeSortType.PUBLISH_YEAR) {
				unknownFolder.type = BookFolderType.PUBLISH_YEAR;
				this.walkTreeByPublishYear(map,rawTree,this.bookDispTree);
			}
		}

		// caculate count
		this.accumulateTreeCount(this.bookDispTree);
		this.sortBookTree(this.bookDispTree,this.plugin.settings.bookTreeSortAsc);
			
		// TODO: make tree reactive (better way??)
		// TODO: what about other book
		// reactive(this.bookDispTree);
		// console.log(this.bookDispTree);
		// console.log("disp tree updated");
		
	}


	
	private async walkBookVault(vid: string, vaultPath: string, rootPath: string, root: BookFolder) {

		const dirpath = utils.normalizePath(vaultPath,rootPath);
		const files = Platform.isMobile ? await utils.fs.readdir(dirpath) : utils.fs.readdirSync(dirpath);
		// console.log("walk in :", dirpath);

		// TODO: get losted book?
		for(var i = 0; i < files.length; i++) {
			const name = files[i];
			const path = rootPath+"/"+name;
			const entry = `${vid}:${path}`;

			if (await utils.isFolder(utils.normalizePath(vaultPath,path))) { // folder
				if (name.startsWith(".")) continue;

				var folder = this.bookMap.get(entry) as BookFolder;
				if (!folder) {		// new folder
					folder = reactive(new BookFolder(root, vid, name, path));
					root.push(folder);
					this.bookMap.set(entry, folder);	
				} else {			// existed folder
					if (folder.lost) {
						folder.lost = false;
					}
				}
				folder.existFlag = true;
				await this.walkBookVault(vid, vaultPath, path, folder);
			} else { // file
				const ext = utils.getExtName(path);
				if (!this.isValidBook(name,ext)) continue; // TODO: add all file type??

				var book = this.bookMap.get(entry);
				if (!book) {	// new book		
					const bookname = name.substring(0,ext.length? name.length - ext.length-1:name.length);
					book = reactive(new Book(root, vid, bookname, path, ext));
					root.push(book);
					this.bookMap.set(entry, book);
				} else {		// existed book
					if (book.lost) book.lost = false;
				}
				book.existFlag = true;
			}
		}

		// delete book
		for(var i = root.children.length - 1; i >= 0; i--) {
			const absbook = root.children[i];
			if (!absbook.existFlag) {

				if (!absbook.lost) {
					if (absbook.isFolder()) {
						if (this.removeBookFolder(absbook as BookFolder)) {
							this.bookMap.delete(absbook.getEntry());
							root.children.remove(absbook);
						}
					} else {
						this.removeBook(absbook as Book);
						root.children.remove(absbook);
					}	
				} 
			} else {
				absbook.existFlag = false;
			}
		}
	}

	private removeBookFolder(folder: BookFolder, removeData: boolean = false): boolean{
		for(var i = folder.children.length - 1; i >= 0; i--) {
			const absbook = folder.children[i];

			if (!absbook.lost) {
				if (absbook.isFolder()) {
					if (this.removeBookFolder(absbook as BookFolder, removeData)) {
						this.bookMap.delete(absbook.getEntry());
						folder.children.remove(absbook);
					}
				} else {
					if (this.removeBook(absbook as Book)) {
						folder.children.remove(absbook);
					}
				}	
			} 
		}
		return folder.children.length === 0;
	}

	private removeBook(book: Book, removeData: boolean = false) {
		if (book.bid) {
			book.lost = true;	
			if (book.view) {
				book.view.leaf.detach();
			}
			return false;
		} else {	
			this.bookMap.delete(book.getEntry());
			book.parent.children.remove(book);
			return true;
		}
		
	}

	async loadBookVault(vid: string) {

		const path = this.getBookVaultPath(vid);
		if (!this.root.get(vid)) {
			this.addBookVault(vid);
		}

		const folder = this.root.get(vid);
		

		if (!utils.isFolderExists(path)) {
			folder.lost = true;
		} else {
			return this.walkBookVault(vid, path, "", folder);
		}
	}

	

	async loadAllBookVault() {
		for (var vid in this.plugin.settings.bookVaultNames) {
			if (!this.getBookVaultPath(vid)) {
				console.log("skip bookvault:", this.getBookVaultName(vid))
				continue;
			}
			await this.loadBookVault(vid);
		}
	}



	async loadAllBookData() {
		// TODO: wait until ob files loaded
		const dataFolder = utils.app.vault.getAbstractFileByPath(this.getBookDataPath()) as TFolder;
		if (!dataFolder || !(dataFolder instanceof TFolder)) return;


		for(var i = 0 ;i < dataFolder.children.length; i++) {
			const file = dataFolder.children[i];
			if (!(file instanceof TFile)) continue;

			const meta = await utils.app.metadataCache.getFileCache(file as TFile).frontmatter;

			if (!meta || !meta["bm-meta"]) {
				new Notice("非配置文件:"+file.name,0)
				console.error("非配置文件:"+file.name,meta)
				continue;
			}
			
			const {vid,bid,path,name,ext} = meta;
			if (!vid || !bid) { // TODO: check book path?
				new Notice("无效配置文件:"+file.name);
				console.error("无效配置文件:"+file.name)

				continue; 
			}


			if (!this.root.has(vid)) {
				console.warn(`书库 ${vid} 不存在`)
				continue; 
			}

			if (!this.root.has(vid)) {
				this.addBookVault(vid);
			}

			const entry = `${vid}:${path}`;
			var book = this.bookIdMap.get(bid);
			if (book) { // old data file
				// TODO: move book when change vid or path manually, which should not happen
				// if (book.vid !== vid || book.path !== path) { 
				// 	book.parent.children.remove(book);
				// 	book.vid = vid;
				// 	book.path = path;
				// 	if (this.root.get(vid)) {
				// 		const folder = this.getBookFolder(vid,book.path,this.root[vid]) // exist root[vid]?
				// 		book.parent = folder;
				// 		folder.push(book);
				// 	}
				// }
				// book.lost = !this.bookMap.has(entry)	// update book lost flag
			} else { // new book data file
				
				book = this.bookMap.get(entry) as Book;

				if (!book || book.isFolder()) {   // this book is lost

					const folder = this.getBookFolder(vid, utils.getFolderName(path),this.root.get(vid),this.bookMap);
					book = reactive(new Book(folder, vid, name, path, ext, bid, true)); // book is lost
					folder.push(book);
					this.bookMap.set(entry, book);
				} else if (book.bid) { //not lost, but has repeat bid
					if (bid !== book.bid) {
						new Notice(`book id ${bid} exist, already has ${book.bid}`)
						console.error(`book id ${bid} exist, already has ${book.bid}`);
						continue;
					}
				}			
				this.bookIdMap.set(bid, book);
			} 

			book.loadBookData(meta);
			// FIXME: data file is deleted manualy??
		}
	}


    async update() {	
		return this.loadAllBookVault().then(() => {
			console.log("book vault updated");
			return this.loadAllBookData().then(() => {
				console.log("book vault data updated");
				return this.updateBookDispTree();
			});
			
		});
    }



}