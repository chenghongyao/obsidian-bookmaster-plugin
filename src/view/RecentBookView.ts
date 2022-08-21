import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import Vue from "vue";
import BookMasterPlugin from "src/main";
import obtree from "../components/v-obtree.vue" 



export const VIEW_TYPE_RECENT_BOOKS = "bm-recent-book-view"
export class RecentBookView extends ItemView {
	plugin: BookMasterPlugin;
	vueApp: Vue;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Recent Books";
	}

	getViewType() {
		return VIEW_TYPE_RECENT_BOOKS;
	}

	getIcon() {
		return "book-open";	
	}


	openContextMenu(evt: MouseEvent, book:Book) {
		const menu = new Menu();

		menu.addItem((item) => {
            item
            .setTitle("清除所选")
			.setIcon("trash")
            .onClick(() => {
                this.plugin.removeRecentBook(book);
            })
        });
		menu.addSeparator();
        this.plugin.createBookContextMenu(menu,book);
		menu.showAtMouseEvent(evt);
	}

    onPaneMenu(menu: Menu, source: 'more-options' | 'tab-header' | string): void {
        
        menu.addItem((item) => {
            item
            .setTitle("清除所有")
            .onClick(() => {
                this.plugin.resetRecentBooks();
            })
        });
        super.onPaneMenu(menu, source);
    }

    
	async onOpen() {

		console.log("RecentBookView Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";


        const el = this.contentEl.createDiv()
		const self = this;
		this.vueApp = new Vue({
			el: el,
			render: h => h('obtree', {
				attrs: {
					data: self.plugin.recentBooks,
					showTitle: false,
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
		console.log("RecentBookView Close");
	}
}

