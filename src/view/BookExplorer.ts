import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book, BookTreeSortType } from "../Book";
import BookMasterPlugin from "../main";
import Vue from "vue";

import vObtree from "../components/v-obtree.vue"
import NavHeader from "./NavHeader";
import BookSuggestModal from "./BookSuggestModal";


export const VIEW_TYPE_BOOK_EXPLORER = "bm-explorer-view"
export class BookExplorer extends ItemView {
    plugin: BookMasterPlugin;
    header: NavHeader;


    constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

    getDisplayText() {
        return "Book Explorer"
    }
    getViewType() {
        return VIEW_TYPE_BOOK_EXPLORER;
    }
    getIcon() {
		return "bold-glyph";	
	}


	private openSortContextMenu(evt: MouseEvent) {
		const menu = new Menu(this.app);
		const self = this;
		menu.addItem((item) => {
			item
			.setTitle("升序")
			.onClick(async ()=> {
				if (!self.plugin.settings.bookTreeSortAsc) {
					self.plugin.settings.bookTreeSortAsc = true;
					await self.plugin.saveSettings(); 
					self.plugin.updateDispTree();
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
					self.plugin.updateDispTree();
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
					self.plugin.updateDispTree();
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
					self.plugin.updateDispTree();
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
					self.plugin.updateDispTree();
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
					self.plugin.updateDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === BookTreeSortType.PUBLISH_YEAR)
				item.setIcon("checkmark");

		});
		
		menu.showAtMouseEvent(evt);
	}

	private openBookContextMenu(evt: MouseEvent, book: Book) {
        const menu = new Menu(this.app);
		this.plugin.createBookContextMenu(menu,book);
		menu.showAtMouseEvent(evt);
    }

	private createHeader() {
        this.header = new NavHeader(this,this.contentEl);

        this.header.addAction("reset","更新",(evt) => {
			this.plugin.loadAllBookVaults().then(() => {
				new Notice("已更新");
            }).catch((err) => {
				new Notice("书库加载失败,重新检查书库路径\n"+err);
				this.leaf.detach();
			})
		});

		this.header.addAction("stacked-levels","排序",(evt) => {
			this.openSortContextMenu(evt);
		});
		this.header.addAction("search","搜索",(evt) => {
			new BookSuggestModal(this.app, this.plugin,this.plugin.root[this.plugin.settings.currentBookVault]).open();
		});

		this.header.addAction("gear","设置",(evt) => {
			const menu = new Menu(this.app);
			this.createSettingMenu(menu)
			menu.showAtMouseEvent(evt);

		});
    }

	private createSettingMenu(menu:Menu) {
		menu.addItem((item) => {
			item
			.setTitle("切换书库")
			.onClick((e) => {
				const m = new Menu(this.app);
				this.createOptionsMenu(m);
				m.showAtMouseEvent(e as MouseEvent);

			})
		}) 
	}

	private createOptionsMenu(menu: Menu) {

		for(const key in this.plugin.settings.bookVaultNames) {
			menu.addItem((item) => {
				item
				.setTitle(this.plugin.settings.bookVaultNames[key])
				.onClick((e) => {
					this.plugin.settings.currentBookVault = key;
					this.plugin.saveSettings();
					this.plugin.updateDispTree();
				});

				if (key === this.plugin.settings.currentBookVault) {
					item.setIcon("checkmark");
				}
			})
		}
		
	}
	onMoreOptionsMenu(menu: Menu): void {
		this.createOptionsMenu(menu);

	}

	onHeaderMenu(menu: Menu): void {
		this.createOptionsMenu(menu);
		menu.addSeparator();
		super.onHeaderMenu(menu);
	}

    async onOpen() {
        console.log("Book Explorer Open");
        this.contentEl.empty();
        this.contentEl.style.padding = "0";
        this.contentEl.style.overflow = "hidden";


        this.plugin.updateDispTree().then(() => {
			this.createHeader();
			const self = this;
			const el = this.contentEl.createDiv();
			const vueApp = new Vue({
				el: el,
				render: (h:any) => h('v-obtree', {
					attrs: {
						// title: this.plugin.dispTree.name,
						data: self.plugin.dispTree,
					},
					on: {
						'select-file': function (book: Book) {
                            // console.log("select file:",book);
						},
						'open-file': function (book: Book, ctrlKey: boolean) {
							self.plugin.openBook(book,ctrlKey);
							
						},
						'context-menu': function(evt: MouseEvent, book: Book) {
							self.openBookContextMenu(evt,book);
							
						}
	
					},
					ref: "obtree",
				}),
				components: {
					vObtree,
				}
			});
			// this.obtree = vueApp.$refs.obtree;
		}).catch((err) => {
			new Notice("书库加载失败,重新检查书库路径\n"+err);
			this.leaf.detach();
		})


    }

}