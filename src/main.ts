import {ItemView, MarkdownView, Menu, Notice, ObsidianProtocolData, PaneType, Platform, Plugin, TFile, ViewCreator} from "obsidian";
import { VIEW_TYPE_BOOK_EXPLORER, BookExplorer } from "./view/BookExplorer";

import { BookVaultManager } from "./BookVault";
import { BookMasterSettings, DEFAULT_SETTINGS, DeviceSetting, DEFAULT_DEVICE_SETTINGS } from "./settings";
import * as utils from './utils'
import { AbstractBook, Book, BookFolder, BookFolderType, BookStatus} from "./Book";
import { BookView, VIEW_TYPE_BOOK_VIEW } from "./view/BookView";
import { supportBookExts } from "./constants";
import { BookMasterSettingTab } from "./view/BookMasterSettingTab";
import BookSuggestModal from "./view/BookSuggestModal";
import BasicBookSettingModal from "./view/BasicBookSettingModal";

// TODO: wait for book vault setup
// TODO; set timer
// TODO: description 放正文

export default class BookMasterPlugin extends Plugin {
	
	settings: BookMasterSettings
	bookVaultManager: BookVaultManager;
	bookExplorer: BookExplorer;
	// lastActiveBookView: BookView = null; // TODO: history??
	lastActiveMarkdownView: MarkdownView;

	annotationImageSelector: string;
    async onload() {

		await this.loadSettings();
		
		// book vault manage
		this.bookVaultManager = new BookVaultManager(this);
		this.app.workspace.onLayoutReady(() => {
			this.bookVaultManager.update();	
		});

		// `registe`r views
		this.safeRegisterView(VIEW_TYPE_BOOK_EXPLORER,leaf => new BookExplorer(leaf,this));
		this.safeRegisterView(VIEW_TYPE_BOOK_VIEW,leaf => new BookView(leaf,this));

		this.addSettingTab(new BookMasterSettingTab(this.app, this));

		// command
		this.addRibbonIcon("library","Book Explorer", (evt) => {
			this.activateView(VIEW_TYPE_BOOK_EXPLORER, "left").then((view: BookExplorer) => {
				this.bookExplorer = view;
			});
		});
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

		// update last active view
		this.app.workspace.on("active-leaf-change",(leaf) => {
			// if (leaf.view.getViewType() === VIEW_TYPE_BOOK_VIEW) {
			// 	this.lastActiveBookView = leaf.view as BookView;
			// 	console.log("active view:", this.lastActiveBookView.book.name);
			// }

			if (leaf.view instanceof MarkdownView) {
				this.lastActiveMarkdownView = leaf.view;
			}
		})
		// this.app.workspace.on("")

	
		
		
		this.registerProtocalHandler();
    }

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


		// this.registerMarkdownPostProcessor((element, context) => {
		// 	console.log("post:",element);
		// })

		// this.app.workspace.on("")

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
		var leaf;

		const oldLeafs = this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW);
		if (!newPanel && oldLeafs.length) {
			// this.app.workspace.setActiveLeaf(oldLeafs[0]);
			leaf = this.app.workspace.createLeafInParent((oldLeafs[0] as any).parent, -1);
			// leaf = this.app.workspace.getLeaf("tab");
		} else {
			// leaf = this.app.workspace.getLeaf("window");		
			leaf = this.app.workspace.getLeaf("split");	
		}

		leaf.setGroup("bookview-group");
		await leaf.setViewState({
			type: VIEW_TYPE_BOOK_VIEW,
			active: true,
		});
		return leaf.view as BookView;
	}
    private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

	// async updateDispTree() {
	// 	return this.bookVaultManager.update();
	// }


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
	
		return Promise.all([this.bookVaultManager.getBookIdPath(book),this.app.vault.read(file)]).then((value) => {
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

	async openBook(book: Book, newPanel: boolean=false, state?: any) {
		if (book.lost) {
			// TODO: fix lost book
			new Notice("文件丢失");
			return;
		}
		// TODO: book is visual
		if (this.settings.openAllBookWithDefaultApp || this.settings.openBookExtsWithDefaultApp.includes(book.ext)) {
			this.openBookBySystem(book);
		} else if (supportBookExts.includes(book.ext)) { // TODO: support exts
			var leaf;

			if (book.view) {
				leaf = book.view.leaf;
				book.view.setViewerState(state);
			} else {
				const view = await this.createNewBookView(newPanel);
				const bid = await this.bookVaultManager.getBookIdSafely(book);
				await view.openBook(bid, state);
				leaf = view.leaf;
			}
			this.app.workspace.setActiveLeaf(leaf);
		} else {
			this.openBookBySystem(book);
		}


		// if open by system
		// if (book.vid) {
		// 	return this.getBookId(book).then((bid) => {
		// 		this.appendRecentBook(book);
		// 	});
		// }
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