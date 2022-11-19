import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { createApp } from "vue";
import BookMasterPlugin from "src/main";
import NavHeader from "./NavHeader";
import vObtree from "../components/v-obtree.vue"
import BookProjecetManager from "src/BookProject";



export const VIEW_TYPE_BOOK_PROJECT = "bm-book-project"
export class BookProject extends ItemView {
	plugin: BookMasterPlugin;
	bookProjectManager: BookProjecetManager
	navHeader: NavHeader;
	vm: any;
	pin: boolean;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.bookProjectManager = plugin.bookProjectManager;

	}

	getDisplayText() {
		return "Book Project";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_PROJECT;
	}

	getIcon() {
		return "album";	
	}


	openContextMenu(evt: MouseEvent, book:Book) {
		const menu = new Menu();
        this.plugin.createBookContextMenu(menu,book);
		menu.showAtMouseEvent(evt);
	}

	onPaneMenu(menu: Menu, source: 'more-options' | 'tab-header' | string): void {
		menu.addItem((item) => {
			item
			.setTitle("关闭")
			.setIcon("cross")
			.onClick(() => {
				this.leaf.detach();
			})
		});
	}

	async onOpen() {

		console.log("BookProject Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";

		this.navHeader = new NavHeader(this,this.contentEl);
		// this.navHeader.addAction("reset","更新",(evt) => {
		// 	this.plugin.updateBookProject();
		// })


		const elPinProject = this.navHeader.addAction("pin",this.plugin.settings.pinProjectFile ? "取消锁定工程" : "锁定工程",(evt) => {
			
			const el = (evt.target as  HTMLElement).addClass("mod-pinned");
			this.plugin.settings.pinProjectFile = !this.plugin.settings.pinProjectFile;

			if (this.plugin.settings.pinProjectFile) {
				elPinProject.style.color = "var(--text-accent)";
				elPinProject.ariaLabel = "取消锁定工程";
			} else {
				elPinProject.style.color = "";
				elPinProject.ariaLabel = "锁定工程";

				if (this.plugin.lastActiveMarkdownView && this.plugin.lastActiveMarkdownView.file !== this.bookProjectManager.projectFile) {
					const projFile = this.bookProjectManager.searchProjectFile(this.plugin.lastActiveMarkdownView.file);
					if (projFile) {
						this.bookProjectManager.loadProjectFile(projFile);
						
					}
				}
			}

			this.plugin.saveSettings();
		});

		if (this.plugin.settings.pinProjectFile) {
			elPinProject.style.color = "var(--text-accent)";
		}

		
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		});
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		});

		// const title = this.plugin.path.basename(this.plugin.settings.bookPath);
		const el = this.contentEl.createDiv()
		const self = this;

		this.vm = createApp(vObtree, {
			root: this.bookProjectManager.projectBooks,
			onSelectFile: function (book: Book) {
				// console.log("select file:",book);
			},
			onOpenFile: function (book: Book, ctrlKey: boolean) {
				self.plugin.openBook(book,ctrlKey);
				
			},
			onContextMenu: function(evt: MouseEvent, book: Book) {
				self.openContextMenu(evt,book);
				
			},
		}).mount(el);

		// this.vueApp = new Vue({
		// 	el: el,
		// 	render: h => h('obtree', {
		// 		attrs: {
		// 			data: self.plugin.currentBookProjectBooks
		// 		},
		// 		on: {
		// 			'select-file': function (book: Book) {
		// 			},
		// 			'open-file': function (book: Book,ctrlKey: boolean) {
		// 				self.plugin.openBook(book,ctrlKey);
						
		// 			},
		// 			'context-menu': function(evt: MouseEvent, item: any) {
		// 				self.openContextMenu(evt,item);
		// 			}
		// 		},
		// 		ref: "obtree"
		// 	}),
		// 	components: {
		// 		obtree,
		// 	}
		// });

	}

	async onClose() {
		console.log("BookProject Close");
	}
}

