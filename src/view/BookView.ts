import { ItemView, Menu, Notice, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { DocumentViewer } from "../documentViewer/documentViewer";
import { PDFTronViewer } from "../documentViewer/PDFTronViewer";
import BookMasterPlugin from "src/main";
import { EpubJSViewer } from "../documentViewer/EPUBJSViewer";
import { HTMLViewer } from "../documentViewer/HtmlViewer";



interface BookTab {
	bid: string;
	head: HTMLDivElement;
	container: HTMLDivElement;
	viewer: DocumentViewer;
	title: string;
	book: Book;
}

export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;
	// bid: string;
	// viewer: DocumentViewer;
	bookTabs: Array<BookTab>;
	currentTab: BookTab;
	tabContainer: HTMLDivElement;
	viewerContainer: HTMLElement;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.leaf.setPinned(true); 
		this.bookTabs = [];
		this.currentTab = null;
		// this.bid = null;
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
			// bid: this.bid,
			// state: this.viewer?.getState()
		}
	}

	async setState(state: any, result: ViewStateResult) {
		console.log("[BookView]set state")
		// console.log(state);
		// console.log(result);
		// if (state.bid) {
		// 	this.openBook(state.bid,state.state);
		// }
	}

    private setTitle(title: string) {
        this.containerEl.children[0].getElementsByClassName("view-header-title")[0].setText(title);
    }

    async onOpen() {
		console.log("BookView Open");
		this.contentEl.empty();
        this.contentEl.style.padding = "0";
		this.contentEl.addClass("bm-bookview");

		this.tabContainer = this.contentEl.createDiv();
		this.tabContainer.addClass("bm-bookview-tab-container")

		this.viewerContainer = this.contentEl.createDiv();
		this.viewerContainer.addClass("bm-bookview-viewer-container");
    }


	private getCurrentBook() {
		if (this.currentTab) {
			return this.plugin.getBookById(this.currentTab.bid);
		} else {
			return null;
		}
	}

	private addBookTab(bid:string,title:string,ext:string) {

		if (this.bookTabs.length === 1) {
			this.tabContainer.addClass("visible");
		}

		const head = this.tabContainer.createDiv();
		head.addClass("bm-bookview-tab-item-container")
		head.title = title;
		head.textContent = title;
		this.tabContainer.appendChild(head);
		
		const container = document.createElement("div");
		container.addClass("bm-bookview-viewer-item-container");
		container.addClass("bm-bookview-"+ext);
		this.viewerContainer.appendChild(container);


		this.bookTabs.push({
			bid: bid,
			head:head,
			container: container,
			viewer: null,
			title: title,
			book: null,
		})

		const tab = this.bookTabs.last();
		this.showBookTab(tab);

		head.onclick = () => {
			this.showBookTab(tab);
		};
		head.oncontextmenu = (e) => {
			const menu = new Menu(this.plugin.app);
			menu.addItem((item) => {
				item
				.setTitle("关闭")
				.setIcon("cross")
				.onClick((e) => {
					this.closeBookTab(tab);
				})
			})
			menu.showAtMouseEvent(e);
		}
		return tab;
	}

	private showBookTab(tab: BookTab) {
		if (tab == this.currentTab) return;
		if (this.currentTab) {
			this.currentTab.container.removeClass("visible");
			this.currentTab.head.removeClass("active");	
		}
		
		this.currentTab = tab;
		this.currentTab.container.addClass("visible");
		this.currentTab.head.addClass("active");

		this.setTitle(this.currentTab.title);
	}


	private async closeBookTab(tab: BookTab) {
		console.log("close:",tab)
		await tab.viewer.closeDocument();
		this.viewerContainer.removeChild(tab.container);
		this.tabContainer.removeChild(tab.head);


		const closeCurr = this.currentTab === tab;
		this.bookTabs.remove(tab);

		if (this.bookTabs.length === 0) {
			this.leaf.detach();
			return;
		}

		if (closeCurr) {
			this.currentTab = null;
			this.showBookTab(this.bookTabs[0]);
		}

		if (this.bookTabs.length === 1) {
			this.tabContainer.removeClass("visible")
		}




	}

	async openBook(bid: string,state?: any) {
		for(var i = 0; i < this.bookTabs.length; i++) {
			const tab = this.bookTabs[i];
			if (tab.bid === bid) {
				this.showBookTab(tab);
				this.setTitle(tab.title)
				return;
			}
		}

		// return ??
		return this.plugin.getBookById(bid).then((book) => {
			// TODO: book is undefine

			if (book.ext === "html") {
				const tab = this.addBookTab(bid,book.meta.title || book.name,book.ext);
				tab.book = book; // TODO: save book ref??
				tab.viewer = new HTMLViewer(tab.container);
				const url = "app://local/" + encodeURIComponent(this.plugin.getBookFullPath(book));
				tab.viewer.show(url);

			} else {
				this.plugin.getBookData(book).then((data: ArrayBuffer) => {
					const tab = this.addBookTab(bid,book.meta.title || book.name,book.ext);
					tab.book = book; // TODO: save book ref??
	
					
					if (book.ext === "pdf") {
						const workerPath = this.plugin.getCurrentDeviceSetting().webviewerWorkerPath;
						tab.viewer = new PDFTronViewer(tab.container,workerPath);
					} else if (book.ext === "epub") {
						tab.viewer = new EpubJSViewer(tab.container);
					} 
					
					tab.viewer.show(data,state,book.ext);
	
				}).catch((err) => {
					new Notice("读取文件错误:"+err,0);
				});
			}
			
		});
	}

	async onMoreOptionsMenu(menu: Menu) {
		this.plugin.createBookContextMenu(menu,this.currentTab.book);
	}


    async onClose() {
		this.bookTabs.map((tab) => {
			tab.viewer.closeDocument();
		})
		this.bookTabs = [];
		console.log("BookView Close");
	}

}
