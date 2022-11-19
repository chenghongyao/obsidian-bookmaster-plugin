
import { ItemView, Menu, WorkspaceLeaf, Notice } from "obsidian";
import BookMasterPlugin from "../main";
import NavHeader from "./NavHeader";

import vObtree from "../components/v-obtree.vue"
import { createApp, App as VueApp, h } from "vue";
import { Book, BookFolder, BookTreeSortType } from "../Book";
import { BookVaultManager } from "../BookVault";
import BookSuggestModal from "./BookSuggestModal";



export const VIEW_TYPE_BOOK_EXPLORER = "bm-explorer-view"
export class BookExplorer extends ItemView {
    plugin: BookMasterPlugin;
	bookVaultManager: BookVaultManager;
    header: NavHeader;
	vm: any;


    constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.bookVaultManager = this.plugin.bookVaultManager;
	}

	private startWatchBookDataFile() {
		this.plugin.app.vault.on("create", (file) => {
		});
		this.plugin.app.vault.on("modify", (file) => {

		});
		this.plugin.app.vault.on("delete", (file) => {

		});
	}

    getDisplayText() {
        return "Book Explorer"
    }

    getViewType() {
        return VIEW_TYPE_BOOK_EXPLORER;
    }

    getIcon() {
		return "library";	
	}

    onPaneMenu(menu: Menu, source: string): void {
        menu.addItem((item) => {
			item
			.setTitle("关闭")
			.setIcon("cross")
			.onClick(() => {
				this.leaf.detach();
			})
		});
    }


	private openSortContextMenu(evt: MouseEvent) {
		const menu = new Menu();
		const self = this;
		menu.addItem((item) => {
			item
			.setTitle("升序")
			.onClick(async ()=> {
				if (!self.plugin.settings.bookTreeSortAsc) {
					self.plugin.settings.bookTreeSortAsc = true;
					await self.plugin.saveSettings(); 
					return self.bookVaultManager.updateBookDispTree();
				}
			});
			if (self.plugin.settings.bookTreeSortAsc) {
				item.setIcon("checkmark");
			}
		});

		menu.addItem((item) => {
			item
			.setTitle("降序")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortAsc) {
					self.plugin.settings.bookTreeSortAsc = false;
					await self.plugin.saveSettings(); 
					return self.bookVaultManager.updateBookDispTree();
				}
			});
			if (!self.plugin.settings.bookTreeSortAsc) {
				item.setIcon("checkmark");
			}
		});
		menu.addSeparator();

		menu.addItem((item) => {
			item
			.setTitle("按路径")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== BookTreeSortType.PATH) {
					self.plugin.settings.bookTreeSortType = BookTreeSortType.PATH;
					await self.plugin.saveSettings();
					return self.bookVaultManager.updateBookDispTree();
				}
			});
			if (self.plugin.settings.bookTreeSortType === BookTreeSortType.PATH)
				item.setIcon("checkmark");
		});

		menu.addItem((item) => {
			item
			.setTitle("按标签")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== BookTreeSortType.TAG) {
					self.plugin.settings.bookTreeSortType = BookTreeSortType.TAG;
					await self.plugin.saveSettings();
					return self.bookVaultManager.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === BookTreeSortType.TAG)
				item.setIcon("checkmark");
			
			
		});	
		menu.addItem((item) => {
			item
			.setTitle("按作者")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== BookTreeSortType.AUTHOR) {
					self.plugin.settings.bookTreeSortType = BookTreeSortType.AUTHOR;
					await self.plugin.saveSettings();
					return self.bookVaultManager.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === BookTreeSortType.AUTHOR)
				item.setIcon("checkmark");

		});

		menu.addItem((item) => {
			item
			.setTitle("按发表年份")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== BookTreeSortType.PUBLISH_YEAR) {
					self.plugin.settings.bookTreeSortType = BookTreeSortType.PUBLISH_YEAR;
					await self.plugin.saveSettings();
					return self.bookVaultManager.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === BookTreeSortType.PUBLISH_YEAR)
				item.setIcon("checkmark");

		});
		
		menu.showAtMouseEvent(evt);
	}
	private openBookContextMenu(evt: MouseEvent, book: Book) {
        const menu = new Menu();
		this.plugin.createBookContextMenu(menu,book);
		menu.showAtMouseEvent(evt);
    }
	private openBookFolderContextMenu(evt: MouseEvent, folder: BookFolder) {
        const menu = new Menu();
		this.plugin.createBookFolderContextMenu(menu,folder);
		menu.showAtMouseEvent(evt);
    }
	private createBookVaultOptionsMenu(menu: Menu) {

		this.bookVaultManager.root.forEach((folder, vid) => {
			menu.addItem((item) => {
				item
				.setTitle(folder.name)
				.onClick((e) => {
					// this.plugin.switchBookVault(key);
					this.plugin.settings.currentBookVault = vid;
					this.plugin.saveSettings().then(() => {
						this.bookVaultManager.updateBookDispTree();
					})
				});

				if (vid === this.plugin.settings.currentBookVault) {
					item.setIcon("checkmark");
				}
			})
		})
		
		
	}
	private createSettingMenu(menu:Menu) {
		menu.addItem((item) => {
			item
			.setTitle("切换书库")
			.setIcon("arrow-left-right")
			.onClick((e) => {
				const m = new Menu();
				this.createBookVaultOptionsMenu(m);
				m.showAtMouseEvent(e as MouseEvent);

			})
		}) 
	}
	private createHeader() {
        this.header = new NavHeader(this,this.containerEl);

        this.header.addAction("reset","更新",(evt) => {
			this.bookVaultManager.update().then(() => {
				new Notice("当前书库已更新");
			}).catch((err) => {
				new Notice("书库加载失败：\n"+err);
				this.leaf.detach();
			})
		});

		this.header.addAction("stacked-levels","排序",(evt) => {
			this.openSortContextMenu(evt);
		});
		this.header.addAction("search","搜索",(evt) => {
			new BookSuggestModal(this.app, this.plugin,this.bookVaultManager.getCurrentBookVault()).open();
		});

		this.header.addAction("vault", "书库", (evt) => {
			const menu = new Menu();
			this.createBookVaultOptionsMenu(menu);
			menu.showAtMouseEvent(evt);
		})

		// this.header.addAction("gear","设置",(evt) => {
		// 	// const menu = new Menu();
		// 	// this.createSettingMenu(menu)
		// 	// menu.showAtMouseEvent(evt);

		// });
    }
    
    async onOpen() {
        console.log("Book Explorer Open");
        this.containerEl.empty()
        this.containerEl.style.padding = "0";
        this.containerEl.style.overflow = "hidden";

		
        this.bookVaultManager.updateBookDispTree().then(() => {
			this.createHeader();
			const self = this;
            const el = this.containerEl.createDiv();
			el.className = "nav-files-container"
			el.style.position = "relative"
			
            this.vm = createApp(vObtree,{
				root: this.bookVaultManager.bookDispTree,
				onSelectFile: function (book: Book) {
					// console.log("select file:",book);
				},
				onOpenFile: function (book: Book, ctrlKey: boolean) {
					self.plugin.openBook(book,ctrlKey);
					
				},
				onContextMenu: function(evt: MouseEvent, book: Book) {
					self.openBookContextMenu(evt,book);
					// console.log("context-menu:",book);
					
				},
				onFolderContextMenu: function(evt: MouseEvent, folder: BookFolder) {
					
					self.openBookFolderContextMenu(evt,folder);
					
				},
            }).mount(el);
		}).catch((err) => {
			new Notice("书库加载失败,重新检查书库路径\n"+err);
			this.leaf.detach();
		})

    }

}