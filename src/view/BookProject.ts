import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import Vue from "vue";
import BookMasterPlugin from "src/main";
import NavHeader from "./NavHeader";
import obtree from "../components/v-obtree.vue" 



export const VIEW_TYPE_BOOK_PROJECT = "bm-book-project"
export class BookProject extends ItemView {
	plugin: BookMasterPlugin;
	navHeader: NavHeader;
	vueApp: Vue;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Book Project";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_PROJECT;
	}

	getIcon() {
		return "import-glyph";	
	}


	openContextMenu(evt: MouseEvent, book:Book) {
		const menu = new Menu(this.app);
        this.plugin.createBookContextMenu(menu,book);
		menu.showAtMouseEvent(evt);
	}


	async onOpen() {

        if (!this.plugin.currentBookProjectFile) {
            this.leaf.detach();
        }

		console.log("BookProject Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";

		this.navHeader = new NavHeader(this,this.contentEl);
		// this.navHeader.addAction("reset","更新",(evt) => {
		// 	this.plugin.updateBookProject();
		// })
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		});
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		});
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		});

		// const title = this.plugin.path.basename(this.plugin.settings.bookPath);
		const el = this.contentEl.createDiv()
		const self = this;
		this.vueApp = new Vue({
			el: el,
			render: h => h('obtree', {
				attrs: {
					data: self.plugin.currentBookProjectBooks
				},
				on: {
					'select-file': function (book: Book) {
					},
					'open-file': function (book: Book,ctrlKey: boolean) {
						self.plugin.openBook(book,ctrlKey);
						
					},
					'context-menu': function(evt: MouseEvent, item: any) {
						self.openContextMenu(evt,item);
					}
				},
				ref: "obtree"
			}),
			components: {
				obtree,
			}
		});

	}

	async onClose() {
		console.log("BookProject Close");
	}
}

