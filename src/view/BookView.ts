import { ItemView, Menu, Notice, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { DocumentViewer } from "../documentViewer/documentViewer";
import { PDFTronViewer } from "../documentViewer/PDFTronViewer";
import BookMasterPlugin from "src/main";


export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;
	bid: string;
	viewer: DocumentViewer;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.leaf.setPinned(true); 
		this.bid = null;
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

	getState() {
		return {
			bid: this.bid,
			state: this.viewer?.getState()
		}
	}

	async setState(state: any, result: ViewStateResult) {
		console.log("[BookView]set state")
		console.log(state);
		console.log(result);
		if (state.bid) {
			this.openBook(state.bid,state.state);
		}
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

	async openBook(bid: string,state?: any) {

		if (this.bid === bid) {
			// TODO: set state
			return;
		}

		const workerPath = this.plugin.getCurrentDeviceSetting().webviewerWorkerPath;
		if (this.viewer) {
			this.viewer.closeDocument();		// TODO: create new view??
			this.bid = null;		
		} else {
			this.viewer = new PDFTronViewer(this.contentEl,workerPath);
		}
		
		this.plugin.getBookById(bid).then((book) => {
			// TODO: book is undefine
			this.plugin.getBookData(book).then((data: ArrayBuffer) => {
				new Notice(`${data.byteLength}`)
				this.viewer.show(data,state,book.ext);
			}).catch((err) => {
				new Notice("读取文件错误:"+err,0);
			})
		});
		this.bid = bid;
	}

	onMoreOptionsMenu(menu: Menu) {
		super.onMoreOptionsMenu(menu);
	}


    async onClose() {
		if (this.viewer) {
			this.viewer.closeDocument();
			this.viewer = null;
		}
		console.log("BookView Close");
	}

}
