import {
	App,
	MarkdownView,
	Menu,
	Modal,
	normalizePath,
	Notice,
	ObsidianProtocolData,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	ViewCreator,
} from "obsidian";
import { around } from "monkey-around";
import staticServer, { StaticServer } from './static-server'

import {
	BookExplorerView,
	VIEW_TYPE_BOOK_EXPLORER_VIEW,
} from "./BookExplorerView";

import {
	BookProjectView,
	VIEW_TYPE_BOOK_PROJECT_VIEW,
} from "./BookProjectView";
import {
	AdvanceBookExplorerView,
	VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,
} from "./AdvanceBookExplorerView";
import {
	BookView,
	VIEW_TYPE_BOOK_VIEW
} from "./BookView";

import SearchBookModal from "./SearchBookModal";
import {SUPPORT_BOOK_TYPES} from "./constants"
import {BookAttribute,AbstractBook} from "./types"




interface BookVault {
	name: string,
	path: string,
}


interface BookNoteSettings {
	bookPath: string;
	bookSettingPath: string;
	defaultVaultName: string;

	useLocalWebViewerServer: boolean,
	webviewerRootPath: string,
	webviewerLocalPort: string,
	webviewerExternalServerAddress: string;

	openAllBookBySystem: boolean,
	openOfficeBookBySystem: boolean,

	selectionAnnotationLinkTemplate: string, // highlight,underline ,strikeout,squiggly,freetext 
	regionAnnotationLinkTemplate: string, // 
	currentPageLinkTemplage: string,

	fixedAnnotImageZoom: boolean,
	fixedAnnotImageZoomValue: string,
	addClickEventForAnnotImage: boolean,

	autoOpenProjectView: boolean, // when project note is opened
	copyNewAnnotationLink: boolean,

	bookTreeSortType: Number,
	bookTreeSortAsc: boolean,
	currentBookVault: string,

	bookVaults: Array<BookVault>,

	zoteroImportPath: string,
}

const DEFAULT_SETTINGS: BookNoteSettings = {
	bookPath: "",
	bookSettingPath: "booknote",
	defaultVaultName: "",
	useLocalWebViewerServer: false,
	webviewerRootPath: "",
	webviewerLocalPort: "1448",

	webviewerExternalServerAddress: "https://relaxed-torvalds-5a5c77.netlify.app",

	openAllBookBySystem: false,
	openOfficeBookBySystem: false,


	selectionAnnotationLinkTemplate: "[{{content}}]({{url}})",
	regionAnnotationLinkTemplate: "![[{{img}}#center|{{width}}]]",
	currentPageLinkTemplage: "[**P{{page}}**]({{url}})",

	fixedAnnotImageZoom: true,
	fixedAnnotImageZoomValue: "2",

	addClickEventForAnnotImage: true,

	autoOpenProjectView: true,
	copyNewAnnotationLink: true,

	bookTreeSortType: 0,
	bookTreeSortAsc: true,
	currentBookVault: "default",
	bookVaults: [],

	zoteroImportPath: "",
};



export default class BookNotePlugin extends Plugin {
	settings: BookNoteSettings;

	path: any;
	fs: any;

	// bookTreeData: Array<any> = new Array();
	bookRawTree: Array<AbstractBook> = new Array();  	// 原始文档树
	bookDispTree: Array<AbstractBook> = new Array();	// 用于显示的文档树

	currentBookProjectFile: TFile;
	currentBookProjectBooks: Array<AbstractBook> = new Array();	// todo: book of url??

	localWebViewerServer: StaticServer;

	autoInsertAnnotationLink: boolean;

	bookViewMap: Map<string,BookView> = new Map();
	currentBooksPath: string;
	currentBooksDataPath: string;

	bookVaultMap: {[key:string]:string} = {};

	



	async onload() {

		
		await this.loadSettings();
		
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_BOOK_PROJECT_VIEW);
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_BOOK_VIEW);
	
		this.path = (this.app.vault.adapter as any).path;
		this.fs = (this.app.vault.adapter as any).fs;
		this.autoInsertAnnotationLink = false;

		this.rebuildBookVaultMap();

		this.addSettingTab(new BookNoteSettingTab(this.app, this));



		// this.addRibbonIcon("dice", "opp", (evt) => {
		// 	new Notice((this.app.vault.adapter as any).getBasePath());
		// 	// this.updateBookTree();
		// 	this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW, "left");
		// 	// this.reactivateView(VIEW_TYPE_BOOK_VIEW,"center",true);
		// });

		const bookExplorerIcon = this.addRibbonIcon("bold-glyph","书库", () => {
			this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW,'left');
		});

		this.registerDomEvent(bookExplorerIcon as HTMLAnchorElement,"contextmenu",(evt)=> {
			this.openBookVaultContextMenu(evt);
		})

		this.addCommand({
			id: "open-book-explorer",
			name: "Open Book Explorer",
			callback: () => {
				this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW,'left');
			},
		});

		this.addCommand({
			id: "open-advance-book-explorer",
			name: "Open Advance Book Explorer",
			callback: () => {
				this.reactivateView(VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,'center',true);
			},
		});

		this.addCommand({
			id: "search-book",
			name: "Search Book",
			callback: () => {
				new SearchBookModal(this.app,this).open();
			},
		});

		this.safeRegisterView(
			VIEW_TYPE_BOOK_EXPLORER_VIEW,
			(leaf) => new BookExplorerView(leaf, this)
		);

		this.safeRegisterView(
			VIEW_TYPE_BOOK_VIEW,
			(leaf) => new BookView(leaf,this)
		)


		this.safeRegisterView(
			VIEW_TYPE_BOOK_PROJECT_VIEW,
			(leaf) => new BookProjectView(leaf, this)
		);

		this.safeRegisterView(
			VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,
			(leaf) => new AdvanceBookExplorerView(leaf, this)
		);

		this.registerBookProject();


		const self = this;
		const obProtocalHandler: any = {
			"annotation": function(params: ObsidianProtocolData) {
				const annotId = params["id"];
				const annotBook = self.decodeBookFromPath(params["book"]);
				console.log("anotBook:",annotBook);
				if (annotId && annotBook) {
					// TODO:还需要支持?
					if (self.isForceOpenBySystem(annotBook)) {
						self.openBookBySystem(annotBook);
					} else {
						self.showAnnotationById(annotBook,annotId);
					}
				} else {
					new Notice("标注链接参数错误");
				}
			},
			"open-book": function(params: ObsidianProtocolData) {
				const book = self.decodeBookFromPath(params["book"]);
				self.getBookView(book,true).then((view: BookView) => {
					view.openBook(book,Number(params["page"]));
				})
			},
			"update-book-explorer": function(params: ObsidianProtocolData) {
				self.updateBookDispTree();
			}
		}

		this.registerObsidianProtocolHandler("booknote", (params) => {
			if (obProtocalHandler[params["type"]]) {
				obProtocalHandler[params["type"]](params);				
			}
		});



		this.registerMarkdownPostProcessor((secEl, ctx) => {
			if (this.settings.addClickEventForAnnotImage) {

				const reg = /\/(?:(?:books-data)|(?:extra-books-data\/(.+?)))\/((?:.+)\/)?\(annots\)(.+)\/p(\d+)r((?:\d+(?:\.\d+)?,?){4})z(\d+(?:\.\d+)?)i\((\w+-\w+-\w+-\w+-\w+)\).png/
				
				secEl.querySelectorAll("span.internal-embed").forEach(async (el) => {
					let src = el.getAttr("src");
					console.log("annoSrc:",src);
					if (!src.startsWith(this.settings.bookSettingPath)) {
						return;
					}
					src = src.substr(this.settings.bookSettingPath.length);
					console.log(src);

					const group = reg.exec(src);

					if (group) {
						const bookvault = group[1];
						const bookDir = group[2];
						const bookName = group[3];
						const annotId = group[7];
						
						const bookpath = (bookvault ? "@"+bookvault+"/" : "") + (bookDir || "") + bookName;
						
						console.log("annotBookVault:",bookvault)
						console.log("bookDir:",bookDir)
						console.log("bookName:",bookName);
						console.log("bookpath:",bookpath);
						console.log("annotId:",annotId)

						// TODO :build book directory!!
						// const annotBook: AbstractBook = {
						// 	vault: bookvault || "default",
						// 	name: bookName,
						// 	path: bookpath,
						// 	ext: this.path.extname(bookName);
						// };
						//but,just for test in beta
						const annotBook = this.decodeBookFromPath(bookpath)
						console.log("annotBook:",annotBook)

						this.registerDomEvent(el as HTMLAnchorElement, "dblclick", (e) => {
							console.log("dbclick:",annotBook);
							this.showAnnotationById(annotBook,annotId, false);
						});

						this.registerDomEvent(el as HTMLAnchorElement, "click", (e) => {
							if (e.ctrlKey === true) {
								// TODO: click导致页面无法正常跳转！！
								console.log("ctrl+click:",annotBook);
								this.showAnnotationById(annotBook,annotId,true);
							}
						});

						
					}				
				});
			}
			
		});


		if (this.settings.useLocalWebViewerServer) {
			this.startStaticServer();
		}


	}

	rebuildBookVaultMap() {
		this.bookVaultMap = {};
		for(let i in this.settings.bookVaults) {
			const key = this.settings.bookVaults[i].name;
			this.bookVaultMap[key] = this.settings.bookVaults[i].path;
		}
	}
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	startStaticServer() {
		this.localWebViewerServer = staticServer(this.settings.webviewerRootPath,this.settings.webviewerLocalPort,this);
		this.localWebViewerServer.listen();
	}

	stopStaticServer() {
		if (this.localWebViewerServer) {
			this.localWebViewerServer.close();
			this.localWebViewerServer = null;
		}
	}

	private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

	async reactivateView(type: string, dir?: string, split?: boolean) {

		if (this.app.workspace.getLeavesOfType(type).length == 0) { // if dont exists, create new one,
			var leaf;
			if (dir === "left") {
				leaf = this.app.workspace.getLeftLeaf(split);
			} else if (dir == "right") {
				leaf = this.app.workspace.getRightLeaf(split);
			} else {
				leaf = this.app.workspace.getLeaf(split && !(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			}
			await leaf.setViewState({
				type: type,
				active: true,
			});
		}

		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(type)[0]);
	}

	async safeWriteFile(path: string, data: Buffer|string, overwrite: boolean) {

		const file = this.app.vault.getAbstractFileByPath(path) as TFile;
		if (file) {
			if (!overwrite)return;
			if (typeof data === "string") {
				this.app.vault.modify(file,data as string);
			} else {
				this.app.vault.modifyBinary(file, data as Buffer);
			}
		} else {
			// cant not write to file if folder doesn't exists
			// TODO: ob api to get folder?
			const folderPath = this.path.dirname(path);
			if (folderPath !== ".") {
				const folder = this.app.vault.getAbstractFileByPath(folderPath) as TFolder;
				if (!folder) {
					await this.app.vault.createFolder(folderPath);
				}
			}
			
			if (typeof path === "string") {
				this.app.vault.create(path, data as string);
			} else {
				this.app.vault.createBinary(path, data as Buffer);
			}

			
		}

	}

	private registerBookProject() {
		const self = this;
		// add item in more options
		this.register(
			around(MarkdownView.prototype, {
				onMoreOptionsMenu(next) {
					return function (menu: Menu) {
						const file = this.file;
						if (!file || !self.getPropertyValue(file, "booknote-plugin")) {
							return next.call(this, menu);
						}

						menu.addItem((item) => {
							item.setTitle("打开BookNote工程").onClick(() => {
								self.currentBookProjectFile = file;
								self.updateBookProject();
								self.reactivateView(VIEW_TYPE_BOOK_PROJECT_VIEW, "right");
							});
						});

						const books = self.getPropertyValue(file, "booknote-books");
						if (books && books.length > 0 && books[0]) {
							menu.addItem((item) => {
								item.setTitle("OpenBook").onClick(() => {
									// TODO: support for obsidian vault file!!
									self.openBookInBookView(self.decodeBookFromPath(books[0]), true);
								});
							});
						}

						menu.addSeparator();

						return next.call(this, menu);
					};
				},
			})
		);

		// quick command for opening first book
		this.addCommand({
			id: 'open-book-of-project',
			name: 'Open Book Of Project',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView
					&& markdownView.file 
					&& this.getPropertyValue(markdownView.file,"booknote-plugin") === true 
					&& this.getPropertyValue(markdownView.file,"booknote-books")
					&& this.getPropertyValue(markdownView.file,"booknote-books")[0]) {
						const books = self.getPropertyValue(markdownView.file, "booknote-books");
						if (!checking) {
							// TODO: support for  file in obsidian vault!!
							self.openBookInBookView(this.decodeBookFromPath(books[0]), true);
						}

						return true;
					}
				}
		});

		// TODO:窗口激活也会响应file-open???
		// this.registerEvent(this.app.workspace.on)
		// this.registerEvent(this.app.workspace.on("file-open",(file) => {
		// 	if (this.settings.autoOpenProjectView && file && self.getPropertyValue(file, "booknote-plugin")) {
		// 		self.updateBookProject(file);
		//		self.reactivateView(VIEW_TYPE_BOOK_PROJECT_VIEW, "right");
		// 	}
		// }))
	}


	onunload() {
		this.stopStaticServer();
	}

	setBookExplorerTitle(title:string) {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_EXPLORER_VIEW).length) {
			(this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_EXPLORER_VIEW)[0].view as BookExplorerView).setTitle(title);
		}
	}

	private openBookVaultContextMenu(evt: MouseEvent) {
		const menu = new Menu(this.app);
		menu.addItem((item) => {
			item.setTitle(this.path.basename(this.settings.bookPath))
				.onClick(async () => {
					if (this.settings.currentBookVault !== "default") {
						this.settings.currentBookVault = "default";
						await this.saveSettings();
						this.updateBookDispTree();
						this.setBookExplorerTitle(this.settings.defaultVaultName || this.path.basename(this.settings.bookPath));
					}					
				});
				if (this.settings.currentBookVault === "default") {
					item.setIcon("checkmark");
				}
		});
		menu.addSeparator();
		menu.showAtMouseEvent(evt);

		for(let i in this.settings.bookVaults) {
			const key = this.settings.bookVaults[i].name;
			menu.addItem((item) => {
				
				item.setTitle(key)
					.onClick(async () => {
						if (this.settings.currentBookVault !== key) {
							this.settings.currentBookVault = key;
							await this.saveSettings();
							this.updateBookDispTree();
							this.setBookExplorerTitle(this.settings.bookVaults[i].name || this.path.basename(this.settings.bookPath));
						
						}
					});
				
				if (this.settings.currentBookVault === key) {
					item.setIcon("checkmark");
				}
					
			});


		}

	
	}

	// copy from obsidian-annotator
	getPropertyValue(file: TFile, propertyName: string) {
		if (!file) {
			return null;
		}
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.[propertyName];
	}


	decodeBookFromPath(bookpath: string) : AbstractBook {
		// FIXME http?::
		bookpath.replace(/\\/g,"/"); // replace \ in window to /;
		const reg = /^(?:@(.+?)\/)?((?:.+\/)?((?:.+)\.(\w+)?))$/;
		const grp = reg.exec(bookpath);
		if (!grp) {
			console.error("bookpath exec fail:",bookpath);
			return null;
		}
		return {
			vault: grp[1] || "default", // also default  for url
			path: grp[2],
			name: grp[3],
			ext: grp[4],			
		}
	}

	encodeBookPath(book: AbstractBook) {
		if (book.vault === "default") {
			return book.path;
		} else {
			return `@${book.vault}/${book.path}`;
		}
	}
	

	isSameBook(l: AbstractBook, r: AbstractBook) {
		return (l.path === r.path && l.vault && r.vault);
	}

	isBookSupported(bookname:string, ext: string) {
		return !bookname.startsWith("~$") && !bookname.startsWith(".") && SUPPORT_BOOK_TYPES.indexOf(ext) >= 0;
	}

	getBooksPathOfVault(vault: string) {
		if (vault === "default") {
			return this.settings.bookPath;
		} else {
			if (this.bookVaultMap[vault]) {
				return this.bookVaultMap[vault];
			} else {
				new Notice("not supported vault:"+vault);
				this.settings.bookPath;
			}
		}
	}

	getBooksDataPathOfVault(vault: string) {
		if (vault === "default") {
			return this.settings.bookSettingPath+"/books-data";
		} else {
			if (this.bookVaultMap[vault]) {
				return this.settings.bookSettingPath+"/extra-books-data/"+vault;
			} else {
				new Notice("not supported vault:"+vault);
				return this.settings.bookSettingPath+"/books-data";

			}

		}
	}

	normalizeBooksPathOfVault(vault: string, bookpath: string) {
		return this.path.join(this.getBooksPathOfVault(vault),bookpath);
	}

	normalizeBooksDataPathOfVault(vault: string, path: string) {
		return normalizePath(this.getBooksDataPathOfVault(vault)+"/"+path);
	}


	getCurrentBooksPath() {
		return this.getBooksPathOfVault(this.settings.currentBookVault);
	}

	isCurrentBooksPathValid() {
		const temp = this.getCurrentBooksPath();
		return (
			temp &&
			this.fs.existsSync(temp) &&
			this.fs.statSync(temp).isDirectory()
		);
	}

	private walkByFolderOfVault(vault: string, root: string, tree: Array<AbstractBook>) {

		const files = this.fs.readdirSync(this.normalizeBooksPathOfVault(vault,root));
		files.forEach((name: string) => {
			const bookpath = root ? root+"/"+name : name;
			const stat = this.fs.statSync(this.normalizeBooksPathOfVault(vault,bookpath));

			if (stat.isDirectory()) {
				if (name.startsWith(".")) return;
				const arr = new Array<AbstractBook>();
				tree.push({
					name:name,
					path:bookpath,
					vault:this.settings.currentBookVault,
					children: arr,
				});
				this.walkByFolderOfVault(vault, bookpath,arr);
			} else {
				const ext = this.path.extname(name).substr(1);
				if(!this.isBookSupported(name,ext))return;
				const datapath = this.normalizeBooksDataPathOfVault(vault,bookpath+".md");
				const datafile = this.app.vault.getAbstractFileByPath(datapath) as TFile;
				const attrs = datafile ? this.app.metadataCache.getFileCache(datafile).frontmatter : null;
				tree.push({
					name:name,
					path:bookpath,
					vault: this.settings.currentBookVault,
					ext:ext,
					attrs: attrs,
				});

			}
		});
		return tree;
	}

	private insertTagNode(map: Map<string,Array<any>>,tree: Array<AbstractBook>,tagRoot: string,tags: Array<string>, i: number,book:AbstractBook) {
		if (i === tags.length) {
			tree.push(book);
		} else {
			const nxt = tagRoot + tags[i];
			let arr = map.get(nxt);
			if (!arr) {
				arr = new Array<any>();
				map.set(nxt,arr);
				tree.push({
					name:tags[i],
					children:arr,
					path:nxt,
					vault: book.vault,
				});
			}
			this.insertTagNode(map,arr,nxt,tags,i+1,book);
		}
	}

	private walkTreeByFolder(tree: Array<AbstractBook>, result: Array<AbstractBook>) {
		tree.forEach((book) => {
			if (book.children) {
				const tmp:AbstractBook = {
					name:book.name,
					path:book.path,
					vault:book.vault,
					children:new Array<AbstractBook>(),
				}
				result.push(tmp);
				this.walkTreeByFolder(book.children,tmp.children);
			} else {
				result.push(book);
			}
		});
	}

	private walkTreeByTag(map: Map<string,Array<AbstractBook>>, tree: Array<AbstractBook>, result: Array<AbstractBook>) {

		tree.forEach((book) => {
			if (book.children) {
				this.walkTreeByTag(map,book.children,result);
			} else {
				const tagStr = book.attrs && book.attrs.tags && String(book.attrs && book.attrs.tags);
				if (tagStr) {
					const tags =  tagStr.split(",");
					for (var i = 0; i < tags.length; i++) {
						const tag = tags[i].trim();
						if (!tag)continue; // FIXME: all empty??
						if (map.get(tag)) {
							map.get(tag).push(book);
						} else {
							this.insertTagNode(map,result,"",tag.split("/"),0,book);
						}
					}	
				} else {
					map.get("unknown").push(book);
				}
			}
		});

	}
	
	private walkTreeByAuthor(map: Map<string,Array<AbstractBook>>, tree: Array<AbstractBook>, result: Array<AbstractBook>) {

		tree.forEach((book) => {
			if (book.children) {
				this.walkTreeByAuthor(map,book.children,result);
			} else {
				const authorsStr = book.attrs && book.attrs.author && String(book.attrs.author); // an array will become
				if (authorsStr) {
					const authors = authorsStr.split(",");
					for (var i = 0; i < authors.length; i++) {
						const author = authors[i].trim();
						if (!author)continue; // FIXME: all empty??
						let arr = map.get(author);
						if (!arr) {
							arr = new Array<AbstractBook>();
							map.set(author,arr);
							result.push({
								name:author,
								path:author,
								vault:book.vault,
								children:arr,
							});
						}
						arr.push(book);	
					}	
				} else {
					map.get("unknown").push(book);
				}
			}
		});

	}

	private walkTreeByPublishYear(map: Map<string,Array<AbstractBook>>, tree: Array<AbstractBook>, result: Array<AbstractBook>) {

		tree.forEach((book) => {
			if (book.children) {
				this.walkTreeByPublishYear(map,book.children,result);
			} else {
				// FIXME: publish date could be a number!!
				const dateStr = book.attrs && book.attrs["publish date"] && String(book.attrs["publish date"]);
				if (dateStr && /^\d{4}/.test(dateStr)) {
					const year =  dateStr.substr(0,4);

					let arr = map.get(year);
					if (!arr) {
						arr = new Array<AbstractBook>();
						map.set(year,arr);
						result.push({
							name:year,
							path:year,
							vault:book.vault,
							children:arr,
						});
					}
					arr.push(book);	
					
				} else {
					map.get("unknown").push(book);
				}
			}
		});

	}

	private sortBookDispTree(tree: Array<AbstractBook>) {
		tree.sort((a:AbstractBook,b:AbstractBook)=> {
			if (Boolean(a.children) !== Boolean(b.children)) {
				if (a.children) return -1;
				else return 1;
			} else {
				if (a.children && a.name === "unknown") {
					return 1;
				} else if (b.children && b.name === "unknown") {
					return -1;
				}
				else if (this.settings.bookTreeSortAsc)
					return a.name > b.name ? 1 : -1;
				else
					return a.name < b.name ? 1 : -1;
			}
		})

		for(var i = 0; i < tree.length; i++) {
			if (tree[i].children) {
				this.sortBookDispTree(tree[i].children);
			}
		}
	}

	// TODO: async??
	updateBookDispTree() {
		if (!this.isCurrentBooksPathValid()) return;
		const vault = this.settings.currentBookVault;
		this.bookRawTree.length = 0;
		this.walkByFolderOfVault(vault,"",this.bookRawTree);
		
		this.bookDispTree.length = 0;

		if (this.settings.bookTreeSortType === 0) {
			this.walkTreeByFolder(this.bookRawTree,this.bookDispTree);
		} else {
			const map: Map<string,Array<AbstractBook>> = new Map();
			map.set("unknown", new Array<any>());
			this.bookDispTree.push({
				vault: vault,
				name:"unknown",
				path:"unknown",
				children: map.get("unknown")
			});

			if (this.settings.bookTreeSortType === 1) {
				this.walkTreeByTag(map,this.bookRawTree,this.bookDispTree);
			} else if (this.settings.bookTreeSortType == 2) {
				this.walkTreeByAuthor(map,this.bookRawTree,this.bookDispTree);
			} else {

				this.walkTreeByPublishYear(map,this.bookRawTree,this.bookDispTree);
			}
		}

		this.sortBookDispTree(this.bookDispTree);
	}


	openBookBySystem(book: AbstractBook) {
		// TODO: vault of url??
		const path = book.path;
		if(path.startsWith("http://") || path.startsWith("https://")) {
			window.open(path);
		} else {
			window.open("file://" + this.normalizeBooksPathOfVault(book.vault,path));
		}
	}

	isForceOpenBySystem(book: AbstractBook) {
		return this.settings.openAllBookBySystem 
			|| book.path.startsWith("http://") || book.path.startsWith("https://") 
			|| (this.settings.openOfficeBookBySystem && book.ext != "pdf"); // TODO: office book mean not pdf book?
	}

	openBookInBookView(book: AbstractBook, newPanel?: boolean) {
		if (this.isForceOpenBySystem(book)) {
			this.openBookBySystem(book);
		} else {
			this.getBookView(book, newPanel).then(view => {
						view.openBook(book);
					});
		}
	}

	updateBookProject() {
		if (
			this.currentBookProjectFile &&
			this.getPropertyValue(this.currentBookProjectFile, "booknote-plugin") === true 
		) {
			const bookpaths = this.getPropertyValue(
				this.currentBookProjectFile,
				"booknote-books"
			);

			this.currentBookProjectBooks.length = 0;

			if (bookpaths) {
				const self = this;
				this.currentBookProjectBooks.length = 0;
				bookpaths.forEach((bookpath: string) => {
					if (!bookpath)return;
					const regUrl = /^\[(.*)\]\((http(s)?:\/\/[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+)\)$/
					const urlGroup = regUrl.exec(bookpath);
					if (urlGroup) {
						self.currentBookProjectBooks.push({
							name: urlGroup[1],
							path: urlGroup[2],
							vault: "default",
							ext: "url",
						})
					} else {
						self.currentBookProjectBooks.push(self.decodeBookFromPath(bookpath));
					}
				});
			}
		}
	}


	async getBookView(book?: AbstractBook, newPanel?: boolean) {
		
		if (book) {
			let view = this.bookViewMap.get(this.encodeBookPath(book));
			if (view) {
				this.app.workspace.revealLeaf(view.leaf);
				return view;
			}
		}
		
		newPanel = newPanel || (this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW).length === 0);
		let leaf = null;
		if (newPanel) {
			leaf = this.app.workspace.getLeaf(!(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			await leaf.setViewState({
				type: VIEW_TYPE_BOOK_VIEW,
				active: true,
			});
		} else {
			const act = this.app.workspace.getActiveViewOfType(BookView);
			leaf = act ? act.leaf : this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW)[0];
		}
		this.bookViewMap.set(this.encodeBookPath(book),leaf.view as BookView);
		this.app.workspace.revealLeaf(leaf);
		return leaf.view as BookView;
	}

	genBootAttrMeta(attr: any) {
		var content : string;
		content = "---\n";
		for(const key in attr) {
			content += `${key}: ${attr[key]}\n`;
		}
		content += '---\n'
		return content;
	}


	saveBookAttrs(book: AbstractBook, ntip?: boolean) {
		const dataPath = this.normalizeBooksDataPathOfVault(book.vault, book.path+".md");
		const content = this.genBootAttrMeta(book.attrs);
		this.safeWriteFile(dataPath,content,true).then(() => {
			if (!ntip)new Notice("已保存");
		})
	}

	async showAnnotationById(book: AbstractBook, id: string, newPanel?: boolean) {
		this.getBookView(book,newPanel).then((view: BookView) => {
			view.openBook(book).then((view: BookView) => {
				view.showAnnotation(id);
				//FIXME: 页面上点击无法激活，这里再次激活
				this.app.workspace.setActiveLeaf(view.leaf); 

			})
		})
	}

	saveBookAnnotations(book: AbstractBook, xfdfDoc: Document) {
		const xfdfString = new XMLSerializer().serializeToString(xfdfDoc);
		const dataPath = this.normalizeBooksDataPathOfVault(book.vault,book.path+".xml");		
		this.safeWriteFile(dataPath,xfdfString,true);
	}

	async getBookAnnotations(book: AbstractBook) {
		const file = this.app.vault.getAbstractFileByPath(this.normalizeBooksDataPathOfVault(book.vault,book.path+".xml")) as TFile;
		if (file)
			return this.app.vault.read(file);
		else {
			return null;
		}
	}

	// parse Xfdf String to DOM
	parseXfdfString(xfdfString: string) {
		return new DOMParser().parseFromString(xfdfString,'text/xml');	
	}



	importBetterBibTex(path: string) {
		const regTypeKey =  /@(\w+)\{(\w+),/;
		const regField = /(\w+)\s*=\s*(?:(\w+)|(?:\{(.*)\})),?/;
		const content = this.fs.readFileSync(path,'utf-8');
		const items = content.split("\n\n");
		const results = new Array<any>()
		for (var i = 0; i < items.length; i++) {
			const item = items[i].trim();
			if (!item) continue;
			const lines = item.split("\n");
			const typeAndKey = regTypeKey.exec(lines[0]);
			if (!typeAndKey)continue;
			const res:any = {};
			res["itemtype"] = typeAndKey[1];
			res["citekey"] = typeAndKey[2];
			for (var j = 1; j < lines.length; j++) {
				const line = lines[j].trim();
				if (!line)continue;

				const kv = regField.exec(line);
				if (!kv)continue;
				const key = kv[1];
				let value = kv[2] ? kv[2] : kv[3];
				res[key] = value.replace(/\{|\}/g,"");
			}	


			if (res["file"]) {
				res["file"] = res["file"].replace(/\\\\/g,"\\").replace(/([A-Z])\\:/g,"$1:").split(";");
			}	
			
			if (res["author"]) {
				res["author"] = (res["author"].split("and") as Array<string>).map(s => s.replace(/,/g,"").trim());
			}	

			if (!res["date"]) {

				if (res["year"]) {
					res["date"] = res["year"];

					if (res["month"] && res["month"].length === 3) {
						const allMon = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
						let mon = allMon.indexOf(res["month"]);
						if (mon >= 0) {
							const monstr = String(mon+1);
							res["date"] += monstr.length == 1 ? "-0"+monstr : monstr;
						}
					}
				}


			}
			results.push(res);
		}

		return results;
	}

	
	buildBookPathMap(tree: Array<AbstractBook>, map: Map<string,AbstractBook>) {
		tree.forEach((book) => {
			if(book.children) {
				this.buildBookPathMap(book.children,map);
			} else {
				const absPath = this.normalizeBooksPathOfVault(book.vault,book.path);
				map.set(absPath,book);
			}
		})
	}
	
	writeBookAttrsFromBetterBitTex(path: string) {


		if (!this.fs.existsSync(path)) {
			new Notice("找不到文件");
			return;
		}

		if (!path.endsWith(".bib")) {
			new Notice("仅支持.bib格式文件")
			return;
		}

		const items = this.importBetterBibTex(path);
		if (this.bookRawTree.length === 0) {
			this.updateBookDispTree();
		}

		const map : Map<string,AbstractBook> = new Map();
		this.buildBookPathMap(this.bookRawTree,map);


		// for (var i = 0; i < items.length; i++) {
		// 	const item = items[i];
		// 	console.log("========================================");
		// 	console.log(item["title"]);
		// 	console.log(item["itemtype"],item["citekey"]);

		// 	for (let key in item) {
		// 		if (["title","itemtype","citekey"].indexOf(key) >= 0)continue;
		// 		console.log(key+":"+item[key]);
		// 	}
		// }

		let count = 0;
		for (var i = 0; i < items.length; i++) {
			const item = items[i];

			if (!item.file) {
				console.warn(item);
				console.warn("can't find file from item");
				continue;
			}

			let book: AbstractBook = null;
			for(let i in item.file) {
				book = map.get(item["file"][i]);
				if (book)break;
			}
			if (!book) {
				console.warn(item);
				console.warn("can't find book in current vault");
				continue;
			}

			if (!book.attrs) book.attrs = {};
			// issn,isbn,lccn
			book.attrs["title"] = item["title"] || "";
			book.attrs["author"] = item["author"] || "";
			book.attrs["tags"] = item["keywords"] || "";
			book.attrs["lang"] = item["langid"] || "";
			book.attrs["publisher"] = item["publisher"] || "";
			book.attrs["publish date"] = item["date"] || "";
			book.attrs["doi"] = item["doi"] || "";
			book.attrs["abstract"] = item["abstract"] || "";
			book.attrs["booktype"] = item["itemtype"] || "";
			book.attrs["citekey"] = item["citekey"] || "";
			count++;

			this.saveBookAttrs(book,true);
		}
		
		new Notice(`成功导入${count}/${items.length}项`);
		console.log(`成功导入${count}/${items.length}项`);

		map.clear();
		items.length = 0;
	}

}


class BookNoteSettingTab extends PluginSettingTab {
	plugin: BookNotePlugin;

	constructor(app: App, plugin: BookNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}


	
	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "BookNote" });

		new Setting(containerEl)
			.setName("主书库根路径")
			.setDesc("使用绝对路径，可以使用库外的目录")
			.addText((text) =>
				text.setValue(this.plugin.settings.bookPath).onChange(async (value) => {
					this.plugin.settings.bookPath = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("主书库名")
			.setDesc("对应主书库路径，为空则使用文件夹名")
			.addText((text) =>
				text.setValue(this.plugin.settings.defaultVaultName).onChange(async (value) => {
					this.plugin.settings.defaultVaultName = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.currentBookVault === "default") {
						this.plugin.setBookExplorerTitle(this.plugin.settings.defaultVaultName);
					}
				})
			);	

		new Setting(containerEl)
		.setName("配置文件路径")
		.setDesc("必须使用库内的路径")
		.addText((text) =>
			text.setValue(this.plugin.settings.bookSettingPath).onChange(async (value) => {
				this.plugin.settings.bookSettingPath = value;
				await this.plugin.saveSettings();
			})
		);
		
		new Setting(containerEl)
			.setName("使用本地服务器")
			.setDesc("使用本地服务器需要设置WebViewer库路径和端口")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useLocalWebViewerServer).onChange(async (value) => {
					this.plugin.settings.useLocalWebViewerServer = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.startStaticServer();
					} else {
						this.plugin.stopStaticServer();
					}
				})
			});

		new Setting(containerEl)
			.setName("WebViewer库路径")
			.setDesc("使用本地服务器时有效，使用绝对路径")
			.addText((text) =>
				text.setValue(this.plugin.settings.webviewerRootPath).onChange(async (value) => {
					this.plugin.settings.webviewerRootPath = value;
					await this.plugin.saveSettings();
					// TODO: value check and is server started?
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.stopStaticServer();
						this.plugin.startStaticServer();
					}
				})
			);

		new Setting(containerEl)
			.setName("本地服务器端口")
			.setDesc("使用本地服务器时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.webviewerLocalPort).onChange(async (value) => {
					this.plugin.settings.webviewerLocalPort = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.stopStaticServer();
						this.plugin.startStaticServer();
					}
				})
			});

		new Setting(containerEl)
			.setName("WebViewer远程服务器")
			.setDesc("不使用本地服务器时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.webviewerExternalServerAddress).onChange(async (value) => {
					this.plugin.settings.webviewerExternalServerAddress = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("使用默认应用打开所有书籍")
			.setDesc("使能时双击书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openAllBookBySystem).onChange(async (value) => {
					this.plugin.settings.openAllBookBySystem = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("使用默认应用打开Office书籍")
			.setDesc("使能时双击Office书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openOfficeBookBySystem).onChange(async (value) => {
					this.plugin.settings.openOfficeBookBySystem = value;
					await this.plugin.saveSettings();

				})
			});

		new Setting(containerEl)
			.setName("选文摘录模板")
			.setDesc("选中文字时的模板(如高亮，下划线等)\n可用命令包括page,url,content,img,comment,width,height")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.selectionAnnotationLinkTemplate).onChange(async (value) => {
					this.plugin.settings.selectionAnnotationLinkTemplate = value;
					await this.plugin.saveSettings();
				})
			});
		
		new Setting(containerEl)
			.setName("区域摘录模板")
			.setDesc("非文字类摘录时的模板(如框选等)\n可用命令包括page,url,img,comment,width,height")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.regionAnnotationLinkTemplate).onChange(async (value) => {
					this.plugin.settings.regionAnnotationLinkTemplate = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("当前页回链模板")
			.setDesc("可用命令包括page,url")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.currentPageLinkTemplage).onChange(async (value) => {
					this.plugin.settings.currentPageLinkTemplage = value;
					await this.plugin.saveSettings();
				})
			});
		
		new Setting(containerEl)
			.setName("摘录截图使用固定比例")
			.setDesc("禁止则使用阅读时的缩放等级\n固定比例有利于所有截图不受阅读时的影响，保持统一比例")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedAnnotImageZoom).onChange(async (value) => {
					this.plugin.settings.fixedAnnotImageZoom = value;
					await this.plugin.saveSettings();

				})
			});	

		new Setting(containerEl)
			.setName("固定的摘录截图比例")
			.setDesc("启用固定比例时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.fixedAnnotImageZoomValue).onChange(async (value) => {
					this.plugin.settings.fixedAnnotImageZoomValue = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("为图片摘录添加双击响应")
			.setDesc("启用后双击笔记中的标注图片可自动跳转到原文\n需要图片路径满足规定格式")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.addClickEventForAnnotImage).onChange(async (value) => {
					this.plugin.settings.addClickEventForAnnotImage = value;
					await this.plugin.saveSettings();
				})
			});

		// new Setting(containerEl)
		// 	.setName("打开工程文件时自动打开工程视图")
		// 	.setDesc("每次打开工程文件时都弹出或更新工程视图")
		// 	.addToggle((toggle) => {
		// 		toggle.setValue(this.plugin.settings.autoOpenProjectView).onChange(async (value) => {
		// 			this.plugin.settings.autoOpenProjectView = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// 	})

		new Setting(containerEl)
			.setName("自动复制新标注的回链到剪贴板")
			.setDesc("每次在阅读器添加标注时自动复制回链到剪贴板")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.copyNewAnnotationLink).onChange(async (value) => {
					this.plugin.settings.copyNewAnnotationLink = value;
					await this.plugin.saveSettings();
				})
			});



		new Setting(containerEl)
			.setName("zotero导入路径")
			.setDesc("使用Better BibTex类型数据\n测试！！，请先备份books-data中的数据！！！")
			.addText((text) => {
				text.setValue(this.plugin.settings.zoteroImportPath).onChange(async (value) => {
					this.plugin.settings.zoteroImportPath = value;
					await this.plugin.saveSettings();
				})
			});
		new Setting(containerEl)
			.setName("导入zotero数据(beta)")
			.setDesc("使用Better BibTex类型数据\n测试！！，请先备份books-data中的数据！！！")
			.addButton((btn) => {
				btn.setButtonText("导入").onClick((evt) => {
					this.plugin.writeBookAttrsFromBetterBitTex(this.plugin.settings.zoteroImportPath);
				})
			})

		
	
		for(let i in this.plugin.settings.bookVaults) {
			new Setting(containerEl)
				.setName(`第${Number(i)+1}个书库名`)
				.setDesc("设置后请重启")
				.addText((text) => {
				text.setValue(this.plugin.settings.bookVaults[i].name).onChange((async (value) => {
					this.plugin.settings.bookVaults[i].name = value;
					await this.plugin.saveSettings();
					this.plugin.rebuildBookVaultMap();

				}))
			});

			new Setting(containerEl)
				.setName(`第${Number(i)+1}个书库路径`)
				.setDesc("设置后请重启")
				.addText((text) => {
					text.setValue(this.plugin.settings.bookVaults[i].path).onChange((async (value) => {
					this.plugin.settings.bookVaults[i].path = value;
					await this.plugin.saveSettings();
					this.plugin.rebuildBookVaultMap();

				}))
			});
		}

		new Setting(containerEl)
			.setName("添加书库")
			.setDesc("设置后请重启")
			.addButton((btn) => {
				btn.setButtonText("添加书库")
					.onClick((evt) => {
						const vaultIndex = Object.keys(this.plugin.settings.bookVaults).length;
						this.plugin.settings.bookVaults.push({name:`第${vaultIndex+1}个书库`,path:this.plugin.settings.bookPath})

						new Setting(containerEl)
							.setName(`第${vaultIndex+1}个书库名`)
							.setDesc("设置后请重启")
							.addText((text) => {
							text.setValue(this.plugin.settings.bookVaults[vaultIndex].name).onChange((async (value) => {
								this.plugin.settings.bookVaults[vaultIndex].name = value;
								await this.plugin.saveSettings();
								this.plugin.rebuildBookVaultMap();

							}))
						});

						new Setting(containerEl)
						.setName(`第${vaultIndex+1}个书库路径`)
						.setDesc("设置后请重启")
						.addText((text) => {
							text.setValue(this.plugin.settings.bookVaults[vaultIndex].path).onChange((async (value) => {
								this.plugin.settings.bookVaults[vaultIndex].path = value;
								await this.plugin.saveSettings();
								this.plugin.rebuildBookVaultMap();

							}))
						});
					})
			})


	

	}

	

}