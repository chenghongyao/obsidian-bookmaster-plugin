import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import BookMasterPlugin from "src/main";
import {createApp} from "vue";

import vObtree from "../components/v-obtree.vue"


export const VIEW_TYPE_BOOK_EXPLORER = "bm-explorer-view"
export class BookExplorer extends ItemView {
    plugin: BookMasterPlugin;


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
    async onOpen() {
        console.log("Book Explorer Open");
        this.contentEl.empty();
        this.contentEl.style.padding = "0";

        // this.contentEl.createDiv({text:"Hello"});

        this.plugin.updateDispTree().then(() => {
			// this.createHeader();
			const self = this;
			const el = this.contentEl.createDiv()
			const vueApp = createApp({
				el: el,
				render: (h:any) => h('v-obtree', {
					attrs: {
						title: this.plugin.dispTree.name,
						data: this.plugin.dispTree,
					},
					on: {
						'select-file': function (book: Book) {
                            // console.log("select file:",book);
						},
						'open-file': function (book: Book, ctrlKey: boolean) {
							// self.plugin.openBook(book,ctrlKey);
							
						},
						'context-menu': function(evt: MouseEvent, book: Book) {
							// self.openBookContextMenu(evt,book);
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