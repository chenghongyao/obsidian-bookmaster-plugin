import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { createApp } from "vue";
import BookMasterPlugin from "src/main";
import vObtree from "../components/v-obtree.vue"
import RecentBooksManager from "../RecentBooks";



export const VIEW_TYPE_RECENT_BOOKS = "bm-recent-book-view"
export class RecentBookView extends ItemView {
	plugin: BookMasterPlugin;
	recentBooksManager: RecentBooksManager;
	vm: any;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.recentBooksManager = this.plugin.recentBooksManager;
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
                this.recentBooksManager.removeBook(book);
            })
        });
		menu.addSeparator();
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

        menu.addItem((item) => {
            item
            .setTitle("清除所有")
			.setIcon("trash")
            .onClick(() => {
                this.recentBooksManager.clear();
            })
        });
        // super.onPaneMenu(menu, source);
    }

    
	async onOpen() {

		console.log("RecentBookView Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";


        const el = this.contentEl.createDiv()
		const self = this;
		this.vm = createApp(vObtree, {
			root: this.recentBooksManager.recentBooks,
			showTitle: false,
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

		
	}

	async onClose() {
		console.log("RecentBookView Close");
	}
}

