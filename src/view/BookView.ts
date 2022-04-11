import { ItemView, WorkspaceLeaf } from "obsidian";
import BookMasterPlugin from "src/main";


export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Book View";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_VIEW;
	}

	getIcon() {
		return "pdf-file";	
	}

    private setTitle(title: string) {
        this.containerEl.children[0].getElementsByClassName("view-header-title")[0].setText(title);
    }
    async onOpen() {

		console.log("BookView Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";
        this.contentEl.addClass("book-view-container");
    }

    async onClose() {
		console.log("BookView Close");
	}

}
