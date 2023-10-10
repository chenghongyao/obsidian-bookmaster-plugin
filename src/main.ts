import {ItemView, MarkdownView, Menu, Notice, ObsidianProtocolData, PaneType, Platform, Plugin, setIcon, TFile, ViewCreator, WorkspaceLeaf} from "obsidian";
import { VIEW_TYPE_BOOK_EXPLORER, BookExplorer } from "./view/BookExplorer";

import { BookVaultManager } from "./BookVault";
import { BookMasterSettings, DEFAULT_SETTINGS, DeviceSetting, DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { AbstractBook, Book, BookFolder, BookFolderType, BookStatus} from "./Book";
import { BookView, VIEW_TYPE_BOOK_VIEW } from "./view/BookView";
import { supportedBookExts } from "./constants";
import { BookMasterSettingTab } from "./view/BookMasterSettingTab";
import BookSuggestModal from "./view/BookSuggestModal";
import BasicBookSettingModal from "./view/BasicBookSettingModal";
import RecentBooksManager from "./RecentBooks";
import { RecentBookView, VIEW_TYPE_RECENT_BOOKS } from "./view/RecentBookView";
import BookProjecetManager from "./BookProject";
import { BookProject, VIEW_TYPE_BOOK_PROJECT } from "./view/BookProjectView";
import { around } from "monkey-around";
import exportPDFAnnotation from "./utils/PdfAnnotation";

import "./styles.css"
// TODO: 重复添加book vault watcher

export default class BookMasterPlugin extends Plugin {
	
	settings: BookMasterSettings
	bookVaultManager: BookVaultManager;
	recentBooksManager: RecentBooksManager;
	bookProjectManager: BookProjecetManager;

	// bookExplorer: BookExplorer;
	// lastActiveBookView: BookView = null; // TODO: history??
	lastActiveMarkdownView: MarkdownView;
	annotationImageSelector: string;
	bookProjectStatusEl: HTMLElement;

    async onload() {

		// load or init settings
		await this.loadSettings();
		
		// create all manager
		this.bookVaultManager = new BookVaultManager(this);
		this.recentBooksManager = new RecentBooksManager(this);
		this.bookProjectManager = new BookProjecetManager(this);

		// register all views
		this.safeRegisterView(VIEW_TYPE_BOOK_EXPLORER,leaf => new BookExplorer(leaf,this));
		this.safeRegisterView(VIEW_TYPE_BOOK_VIEW,leaf => new BookView(leaf,this));
		this.safeRegisterView(VIEW_TYPE_RECENT_BOOKS,leaf => new RecentBookView(leaf,this));
		this.safeRegisterView(VIEW_TYPE_BOOK_PROJECT,leaf => new BookProject(leaf,this));
		
		this.addSettingTab(new BookMasterSettingTab(this.app, this));

		// TODO: init all books data when all files in obsidian is loaded
		this.app.workspace.onLayoutReady(() => {
			this.bookVaultManager.update();	
			this.recentBooksManager.setup();
		});

		// add all icon and commands
		// command: open book explorer
		this.addRibbonIcon("library","Book Explorer", (evt) => {
			this.activateView(VIEW_TYPE_BOOK_EXPLORER, "left").then((view: BookExplorer) => {
				// this.bookExplorer = view;
			});
		});

		// command: open recent book view
		this.addCommand({
			id: "bm-open-recent-book-view",
			name: "Open Recent Book View",
			callback: () => {
				this.activateView(VIEW_TYPE_RECENT_BOOKS, "left");
			},
		});
		
		// command: open book project view
		this.addCommand({
			id: "bm-open-book-project-view",
			name: "Open Book Project View",
			callback: () => {
				this.activateView(VIEW_TYPE_BOOK_PROJECT, "right");
			},
		});

		// command: search book command
		this.addCommand({
				id: "bm-search-book",
				name: "Search Book",
				checkCallback: (checking) => {
					const tree = this.bookVaultManager.getCurrentBookVault();
					if (checking) {
						return Boolean(tree);
					} else {
						new BookSuggestModal(this.app, this, tree).open();
						return true;
					}
				}
	
			});

		// register some book project related event or command
		this.registerBookProject();

		// register protocal handler
		this.registerProtocalHandler();
    }

	// register some book project related event or command
	private registerBookProject() {
		const self = this;

		// register onPaneMenu of markdown view
		this.register(
			around(MarkdownView.prototype, {
				onPaneMenu(next) {
					return function (menu: Menu) {
						// book meta file
						if (utils.getPropertyValue(this.file,"bm-meta")) {  
							const meta = self.app.metadataCache.getFileCache(this.file)?.frontmatter;
							const {vid,bid} = meta;
							if (vid && bid) {
								menu.addItem((item) => {
									item.setTitle("Open This Book").setIcon("popup-open") .onClick(() => {	
										self.bookVaultManager.getBookById(bid).then((book) => {
											self.openBook(book);
										}).catch((reason) => {
											new Notice("cant get this book:\n"+reason);
										});
									});
								});	
								menu.addItem((item) => {
									item.setTitle("基本设置").setIcon("gear").onClick((evt) => {	
										self.bookVaultManager.getBookById(bid).then((book) => {
											new BasicBookSettingModal(self.app,self,book,this.leaf.view.contentEl.getBoundingClientRect()).open();
										});
									});
								});	
							}
							menu.addSeparator();
						} else {

							const projFile = self.bookProjectManager.searchProjectFile(this.file);
							if (projFile) {
								menu.addItem((item) => {
									item.setTitle("Open Book Project").onClick(() => {
										self.activateView(VIEW_TYPE_BOOK_PROJECT, "right");
										self.bookProjectManager.loadProjectFile(projFile);
									});
								});

								menu.addItem((item) => {
									item.setTitle("Open Book In Project").onClick(() => {
										self.bookProjectManager.loadProjectFile(projFile).then(() => {
											// TODO:
										});
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

		// status bar
		this.bookProjectStatusEl = this.addStatusBarItem();
		setIcon(this.bookProjectStatusEl, "album");
		const file = this.app.workspace.getActiveFile();
		if (file && this.bookProjectManager.searchProjectFile(file)) {
			this.bookProjectStatusEl.style.color = "var(--text-accent)";
		}
		this.bookProjectStatusEl.onClickEvent((ev:MouseEvent) => {

			const file = this.lastActiveMarkdownView?.file || this.app.workspace.getActiveFile();
			if (!file) return;

			const projFile = this.bookProjectManager.searchProjectFile(file);
			if (!projFile) return;

			this.bookProjectManager.loadProjectFile(projFile).then(() => {
				if (ev.button === 0) {
					this.activateView(VIEW_TYPE_BOOK_PROJECT, "right");				
				} else if (ev.button === 2) {
					const menu = new Menu();
	
					for (const book of this.bookProjectManager.projectBooks.children) {
						menu.addItem((item) => {
							item.setTitle((book as Book).meta.title || book.name)
								.onClick(() => {
									this.openBook(book as Book);
								})
						})
					}

					menu.showAtMouseEvent(ev);
				}
			})
			
			
		});

		// update book project when file is changed
		this.app.metadataCache.on("changed",(file,data,cache) => {
			if (this.bookProjectManager.projectFile && this.bookProjectManager.projectFile == file) {
				this.bookProjectManager.loadProjectFromFile(file);
			}
		})


		// update last active view
		const activeLeafChangeRef = this.app.workspace.on("active-leaf-change",(leaf) => {
			// if (leaf.view.getViewType() === VIEW_TYPE_BOOK_VIEW) {
			// 	this.lastActiveBookView = leaf.view as BookView;
			// 	console.log("active view:", this.lastActiveBookView.book.name);
			// }
			
			if (leaf.view instanceof MarkdownView) {
				this.lastActiveMarkdownView = leaf.view;
				
				const projFile = this.bookProjectManager.searchProjectFile(leaf.view.file);
				if (projFile) {
					if (!this.settings.pinProjectFile && leaf.view.file) {
						this.bookProjectManager.loadProjectFile(leaf.view.file);
					}

					this.bookProjectStatusEl.style.color = "var(--text-accent)"
					// this.bookProjectStatusEl.addClass("book-project-active");
				} else {
					this.bookProjectStatusEl.style.color = ""
					// this.bookProjectStatusEl.removeClass("book-project-active");
				}
			}
		});
		this.register(() => {
			this.app.workspace.offref(activeLeafChangeRef);
		});
		
	}

	// register protocal handler
	private registerProtocalHandler() {
		const self = this;
		const obProtocalHandler: any = {
			"open-book": async function(params: ObsidianProtocolData) {
				
				var book;
				if (params.bid) {
					book = await self.bookVaultManager.getBookById(params.bid)
				} else if (params.vid && params.bpath) {
					book = await self.bookVaultManager.getBookByPath(params.vid, params.bpath)
				} else if (params.fullpath) {
					book = await self.bookVaultManager.getBookByFullPath(params.fullpath);
				}

				if (book) {
					const state = {
						aid: params.aid,
						page: params.page, // TODO: currently support pdf only
					};
					self.openBook(book as Book,false,state);
				}

				// if (bookPromise) {
				// 	bookPromise.then((book) => {
				// 		const state = {
				// 			aid: params.aid,
				// 			page: params.page, // TODO: currently support pdf only
				// 		};
				// 		self.openBook(book,false,state);
				// 	}).catch((err) => {
				// 		new Notice(err);
				// 	});
				// }
			},
			// "update-book-explorer": function(params: ObsidianProtocolData) {
			// 	self.updateDispTree();
			// },
			"basic-book-setting": async function(params: ObsidianProtocolData) {

				// let bookPromise: Promise<Book>;
				// if (params.bid) {
				// 	bookPromise = self.getBookById(params.bid)
				// } else if (params.vid && params.bpath) {
				// 	bookPromise = self.getBookByPath(params.vid, params.bpath)
				// } else if (params.fullpath) {
				// 	bookPromise = self.getBookByFullPath(params.fullpath);
				// }

				// if (bookPromise) {
				// 	bookPromise.then((book: Book) => {
				// 		new BasicBookSettingModal(self.app,self,book).open();
				// 	}).catch((err: string) => {
				// 		new Notice(err);
				// 	});
				// }

				var book;
				if (params.bid) {
					book = await self.bookVaultManager.getBookById(params.bid)
				} else if (params.vid && params.bpath) {
					book = await self.bookVaultManager.getBookByPath(params.vid, params.bpath)
				} else if (params.fullpath) {
					book = await self.bookVaultManager.getBookByFullPath(params.fullpath);
				}

				if (book) {
					// new BasicBookSettingModal(self.app,self,book).open();
				}
			}
		}

		this.registerObsidianProtocolHandler("bookmaster", (params) => {
			if (obProtocalHandler[params["type"]]) {
				obProtocalHandler[params["type"]](params);				
			} else {
				new Notice("[bookmaster]不支持的协议类型："+params["type"]);
			}
		});

		this.annotationImageSelector = ".view-content img[src]";
		// document.on("mousemove", this.annotationImageSelector, this.annotationImageMouseMoveEvent);
		document.on("mousedown", this.annotationImageSelector, this.annotationImageMouseClickEvent);
	}

	onunload(): void {
		// document.off("mousemove", this.annotationImageSelector, this.annotationImageMouseMoveEvent);
		document.off("mousedown", this.annotationImageSelector, this.annotationImageMouseClickEvent);
	}

	// private annotationImageMouseMoveEvent(ev: MouseEvent, target: HTMLElement) {
	// 	// if (ev.ctrlKey) {
	// 	// 	console.log(target.attributes.getNamedItem("src"));
	// 	// }
	// }
	private annotationImageMouseClickEvent = (ev: MouseEvent, target: HTMLImageElement) => {
		if (ev.ctrlKey) {
			const g = /(\w{16})-(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})\.png/.exec(target.src);
			if (g && g.length == 3) {
				const bid = g[1];
				const aid = g[2];
				this.bookVaultManager.getBookById(bid).then((book) => {
					if (book) {
						const state = {
							aid: aid,
						};
						this.openBook(book as Book,false,state);
					}
				});
				
			} 
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
	
	getCurrentDeviceSetting() {
		return this.settings.deviceSetting[utils.appId];
	}

	private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

    async activateView(type: string, layout?: "left" | "right" | "center", split: boolean | PaneType = false, newPanel: boolean = false) {
		var leaf;

		// create new leaf
		if (this.app.workspace.getLeavesOfType(type).length == 0 || newPanel) {
			if (layout === "left") {
				leaf = this.app.workspace.getLeftLeaf(split as boolean);
			} else if (layout === "right") {
				leaf = this.app.workspace.getRightLeaf(split as boolean);
			} else {
				leaf = this.app.workspace.getLeaf(split || !(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			}
			await leaf.setViewState({
				type: type,
				active: true,
			});
		} 
			
		// activate leaf
		leaf = this.app.workspace.getLeavesOfType(type)[0];
		this.app.workspace.revealLeaf(leaf);

		return leaf.view;
	}

	async createNewBookView(newPanel: boolean = false) {
		var leaf: WorkspaceLeaf;

		const oldLeafs = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW);
		if (!newPanel && oldLeafs.length) {
			// this.app.workspace.setActiveLeaf(oldLeafs[0]);
			leaf = this.app.workspace.createLeafInParent((oldLeafs[0] as any).parent, -1);
			// leaf = this.app.workspace.getLeaf("tab");
		} else {
			// leaf = this.app.workspace.getLeaf("window");		
			// leaf = this.app.workspace.getLeaf("split");	
			leaf = this.app.workspace.createLeafInParent((this.app.workspace.getMostRecentLeaf() as any).parent, -1,)
		}

		leaf.setGroup("bm-bookview-group");
		return leaf.setViewState({
			type: VIEW_TYPE_BOOK_VIEW,
			active: true,
		}).then(() => {
			return leaf.view as BookView;
		})
	}

	async openBookBySystem(book: Book, state?: any) {
		if (book.ext === "url") {
			if (Platform.isMobile) {
				(utils.app as any).openWithDefaultApp(book.path);
			} else {
				window.open(book.path);
			}
		} else {
			const fullpath = this.bookVaultManager.getBookFullPath(book);
			if (Platform.isMobile) {
				const relPath = this.bookVaultManager.getMobileRelativePath(fullpath);
				(utils.app as any).openWithDefaultApp(relPath);
			} else {
				window.open("file:///"+fullpath);
			}
		}
	}

	async insertBookToProjectFile(book: Book,file: TFile) {
		return this.bookVaultManager.getBookIdPath(book).then((idpath) => {
			return this.app.fileManager.processFrontMatter(file, (frontmatter) => {

				if (!frontmatter["bm-books"]) {
					frontmatter["bm-books"] = [idpath]
				} 

				if (typeof(frontmatter["bm-books"] ) == "string") {
					frontmatter["bm-books"] = [frontmatter["bm-books"]]
				}

				if (!(frontmatter["bm-books"] instanceof Array)) {
					new Notice("bm-books属性类型非列表，请删除后重试")
					return
				}

				if (frontmatter["bm-books"].contains(idpath)) {
					new Notice("文件已存在")
				} else {
					frontmatter["bm-books"].push(idpath)
				}
			})
		})
	}

	async openBook(book: Book, newPanel: boolean=false, state?: any) {
		if (!book.vid) {
			return;
		}
		
		if (book.lost) {
			// TODO: fix lost book
			new Notice("文件丢失");
			return;
		}

		const bid = await this.bookVaultManager.getBookIdSafely(book);

		// TODO: book is visual
		if (this.settings.openAllBookWithDefaultApp || this.settings.openBookExtsWithDefaultApp.includes(book.ext) || !supportedBookExts.includes(book.ext)) {
			this.openBookBySystem(book);
		} else { // TODO: support exts
			var leaf;

			if (book.view) {
				leaf = book.view.leaf;
				book.view.setViewerState(state);
			} else {
				const view = await this.createNewBookView(newPanel);
				await view.openBook(bid, state);
				leaf = view.leaf;
			}
			this.app.workspace.setActiveLeaf(leaf);
		} 

		// if open by system
		if (book.vid) {
			this.recentBooksManager.addBook(book);
		}
	}

	showBookLocationInSystem(book: AbstractBook) {
		const fullpath = this.bookVaultManager.getBookFullPath(book);
		if (Platform.isDesktop) {
			var exec = require('child_process').exec;
			exec(`explorer.exe /select,"${fullpath}"`)
			return
		} else if (Platform.isMacOS) {
			window.open("file:///"+ fullpath);
		}
	
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
						// this.relocateBook(book);
					})
				);
				menu.addSeparator();
			}

			if (book.ext === "pdf") {
				menu.addItem((item: any) => 
				item
					.setTitle("导出标注后文件")
					.onClick(async () => {
						const annots = await this.bookVaultManager.loadBookAnnotations(book);
						if (!annots) {
							new Notice("无法加载标注文件");
						} else {
							return this.bookVaultManager.getBookContent(book).then((data: ArrayBuffer) => {
								exportPDFAnnotation(this.settings.annotationAuthor, book.name + ".pdf", data, annots);
							});
						}
					}));
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
					const file = this.lastActiveMarkdownView?.file

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
					// console.log("set to:", book);
					// console.log("raw", this.bookVaultManager.getBookById(book.bid));
					// book.lost = !book.lost;
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
							this.bookVaultManager.saveBookDataSafely(book).then(() => {
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
					this.bookVaultManager.getBookIdPath(book).then((idpath) => {
						navigator.clipboard.writeText(idpath);
					});
				})
			);
	
			menu.addItem((item) =>
			item
				.setTitle("复制Obsidian链接")
				.setIcon("link")
				.onClick(()=>{
					this.bookVaultManager.getBookOpenLink(book).then((link) => {
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
					this.bookVaultManager.openBookDataFile(book);
				})
			);

			if (book.vid) {
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
						// TODO: http?
						this.showBookLocationInSystem(book);						
					})
				)
			};
	
		}
	}

	createBookFolderContextMenu(menu: Menu, folder: BookFolder) {

		if (folder.type === BookFolderType.PATH) {
			menu.addItem((item: any) =>
			item
				.setTitle("在系统资源管理器中显示")
				.setIcon("popup-open")
				.onClick(()=>{
					// TODO: http?
					this.showBookLocationInSystem(folder);						
				})
			)
		}
	}

	tryInsertTextToActiveView(content: string) {
		if (this.lastActiveMarkdownView) {
			this.lastActiveMarkdownView.editor.replaceSelection(content);
		} else {
			new Notice("请先激活目标Markdown窗口");
		}
	}

}