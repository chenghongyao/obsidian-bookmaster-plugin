import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import Vue from "vue";
import BookNotePlugin from "./main";
import NavHeader from "./NavHeader";
import obtree from "./view/obtree.vue"

import SearchBookModal from "./SearchBookModal";
import { AbstractBook } from "./types";



export const VIEW_TYPE_BOOK_EXPLORER_VIEW = "book-explorer-view"
export class BookExplorerView extends ItemView {
	plugin: BookNotePlugin;
	navHeader: NavHeader;
	descriptionContainer: HTMLDivElement;
	obtree: any;	

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Book Explorer";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_EXPLORER_VIEW;
	}

	getIcon() {
		return "bold-glyph";	
	}

	openSortContextMenu(evt: MouseEvent) {
		const menu = new Menu(this.app);
		const self = this;
		menu.addItem((item) => {
			item
			.setTitle("升序")
			.onClick(async ()=> {
				if (!self.plugin.settings.bookTreeSortAsc) {
					self.plugin.settings.bookTreeSortAsc = true;
					await self.plugin.saveSettings(); 
					self.plugin.updateBookDispTree();
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
					self.plugin.updateBookDispTree();
				}
			});
			if (!self.plugin.settings.bookTreeSortAsc) {
				item.setIcon("checkmark");
			}
		});
		menu.addSeparator();

		menu.addItem((item) => {
			item
			.setTitle("按文件夹")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== 0) {
					self.plugin.settings.bookTreeSortType = 0;
					await self.plugin.saveSettings();
					self.plugin.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === 0)
				item.setIcon("checkmark");

		});
		menu.addItem((item) => {
			item
			.setTitle("按标签")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== 1) {
					self.plugin.settings.bookTreeSortType = 1;
					await self.plugin.saveSettings();
					self.plugin.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === 1)
				item.setIcon("checkmark");
			
			
		});	
		menu.addItem((item) => {
			item
			.setTitle("按作者")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== 2) {
					self.plugin.settings.bookTreeSortType = 2;
					await self.plugin.saveSettings();
					self.plugin.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === 2)
				item.setIcon("checkmark");

		});

		menu.addItem((item) => {
			item
			.setTitle("按发表年份")
			.onClick(async ()=> {
				if (self.plugin.settings.bookTreeSortType !== 3) {
					self.plugin.settings.bookTreeSortType = 3;
					await self.plugin.saveSettings();
					self.plugin.updateBookDispTree();
				}
			});

			if (self.plugin.settings.bookTreeSortType === 3)
				item.setIcon("checkmark");

		});
	
	
		menu.showAtMouseEvent(evt);
	}


	openContextMenu(evt: MouseEvent, book:AbstractBook) {
		const self = this;
		const menu = new Menu(this.app);
		menu.addItem((item) =>
		item
			.setTitle("复制路径")
			.setIcon("link")
			.onClick(()=>{
				navigator.clipboard.writeText(self.plugin.encodeBookPath(book));
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("使用默认应用打开")
			.setIcon("popup-open")
			.onClick(()=>{
				self.plugin.openBookBySystem(book);
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("设置(未实现")
			.setIcon("popup-open")
			.onClick(()=>{
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("引用(未实现")
			.setIcon("popup-open")
			.onClick(()=>{
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("删除")
			.setIcon("trash")
			.onClick(()=>{
				new Notice("删除文件,暂不实现");
			})
		)

		menu.showAtMouseEvent(evt);
	}


	setTitle(title: string) {
		this.obtree.setTitle(title);
	}



	async onOpen() {

		console.log("BookExplorerView Open");

		const self = this;
		// this.containerEl.children[0].empty();
		this.contentEl.empty();
		this.navHeader = new NavHeader(this,this.contentEl);
		this.navHeader.addAction("reset","更新",(evt) => {
			if (!this.plugin.isCurrentBooksPathValid()) {
				new Notice("书籍路径解析错误,请检查设置后重新打开");
			} else {
				self.plugin.updateBookDispTree();
			}
		})
		this.navHeader.addAction("stacked-levels","排序方式与顺序",(evt) => {
			this.openSortContextMenu(evt);
		})
		this.navHeader.addAction("search","搜索",(evt) => {
			new SearchBookModal(this.app, this.plugin).open();
		})


		if (!this.plugin.isCurrentBooksPathValid()) {
			const ele = this.contentEl.createDiv();
			ele.textContent = "无效书籍路径，请检查设置";
		} else {
			this.plugin.updateBookDispTree();
			// TODO: custom name of default vault
			const title = this.plugin.settings.currentBookVault === "default" ? 
				this.plugin.settings.defaultVaultName || this.plugin.path.basename(this.plugin.settings.bookPath) 
				: this.plugin.settings.currentBookVault;

			const el = this.contentEl.createDiv()
			const vueApp = new Vue({
				el: el,
				render: h => h('obtree', {
					attrs: {
						title: title,
						data: this.plugin.bookDispTree,
						// style: "overflow: auto"
					},
					on: {
						'select-file': function (book: AbstractBook, ctrlKey: boolean) {
							const description = book.attrs?.description;
							self.descriptionContainer.setText(description ? description : '');
							if (ctrlKey) {
								self.plugin.openBookInBookView(book, true);
							}
				
						},
						'open-file': function (book: AbstractBook) {
							self.plugin.openBookInBookView(book,false);
						},
						'context-menu': function(evt: MouseEvent, book: AbstractBook) {
							self.openContextMenu(evt,book);
						}
					},
					ref: "obtree",
				}),
				components: {
					obtree,
				}
			});

			this.obtree = vueApp.$refs.obtree;

			this.descriptionContainer = this.containerEl.createDiv({cls:"book-description-container"});
		}
		
	}
	async onClose() {
		console.log("BookExplorerView Close");
	}
}