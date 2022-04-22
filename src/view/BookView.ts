import { ItemView, Menu, Notice, ViewStateResult, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import * as utils from '../utils'

import { DocumentViewer } from "../documentViewer/documentViewer";
import { PDFTronViewer } from "../documentViewer/PDFTronViewer";
import BookMasterPlugin from "src/main";
import { EpubJSViewer } from "../documentViewer/EPUBJSViewer";
import { HtmlViewer } from "../documentViewer/HtmlViewer";
import { TxtViewer } from "../documentViewer/TxtViewer";
import { ImageViewer } from "../documentViewer/ImageViewer";
import { AudioViewer } from "../documentViewer/AudioViewer";
import { VideoViewer } from "../documentViewer/VideoViewer";

import { ImageExts,AudioExts, VideoExts } from "../constants";


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
	bookTabs: Array<BookTab>;
	currentTab: BookTab;
	tabContainer: HTMLDivElement;
	viewerContainer: HTMLElement;

	callbacks: any;

	constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
		super(leaf);
		this.plugin = plugin;
		this.leaf.setPinned(true); 
		this.bookTabs = [];
		this.currentTab = null;
		// this.bid = null;

		this.callbacks = {
			onAddAnnotation: this.onAddAnnotation.bind(this),
			onModifyAnnotation: this.onModifyAnnotation.bind(this),
			onDeleteAnnotation: this.onDeleteAnnotation.bind(this),
			onCopyAnnotation: this.onCopyAnnotation.bind(this),
			onSaveAnnotaions: this.onSaveAnnotaions.bind(this),
			onClose: this.onCloseViewer.bind(this),
		}

		// this.callbacks.onSaveAnnotaions.bind(this);
		// this.callbacks.onSaveAnnotaions()

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
		const tabsState = new Array<any>();
		for (var i = 0; i < this.bookTabs.length; i++) {
			const tab = this.bookTabs[i];
			tabsState.push({
				bid: tab.bid,
				state: tab.viewer.getState(),
			})
		}
		return {
			tabs: tabsState,
			currentBid: this.currentTab?.bid,
		}
	}

	async setState(state: any, result: ViewStateResult) {
		// console.log("[BookView]set state")

		if (!state.tabs) return;
		const tabsState:Array<any> = state.tabs;
		for (var i = 0; i < tabsState.length; i++) {
			const t = tabsState[i];
			if (t.bid) {
				try {
					await this.openBook(t.bid,t.state);	
				} catch (error) {
					new Notice(error,0);
				}
			}
		}

		if (state.currentBid) {
			for (var i = 0; i < this.bookTabs.length; i++) {
				const tab = this.bookTabs[i];
				if (tab.bid === state.currentBid) {
					this.showBookTab(tab);
					break;
				}
			}
		}

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
			return this.currentTab.book;
		} else {
			return null;
		}
	}

	private addBookTab(bid:string,title:string,type:string) {

		if (this.bookTabs.length === 1) {
			this.tabContainer.addClass("visible");
		}
		
		// head
		const headContainer = this.tabContainer.createDiv();
		headContainer.addClass("bm-bookview-tab-item-container")

		const headText = headContainer.createDiv();
		headText.addClass("bm-bookview-tab-item-text-container")
		headText.title = title;
		headText.textContent = title;

		const headIcon = headContainer.createDiv();
		headIcon.addClass("bm-bookview-tab-item-icon-container")

		this.tabContainer.appendChild(headContainer);
		
		// viewer container
		const container = document.createElement("div");
		container.addClass("bm-bookview-viewer-item-container");
		container.addClass("bm-bookview-"+type);
		this.viewerContainer.appendChild(container);


		this.bookTabs.push({
			bid: bid,
			head:headContainer,
			container: container,
			viewer: null,
			title: title,
			book: null,
		})

		const tab = this.bookTabs.last();
		this.showBookTab(tab);

		headText.onclick = () => {
			this.showBookTab(tab);
		};
		// headText.oncontextmenu = (e) => {
		// 	const menu = new Menu(this.plugin.app);
		// 	menu.addItem((item) => {
		// 		item
		// 		.setTitle("关闭")
		// 		.setIcon("cross")
		// 		.onClick((e) => {
		// 			this.closeBookTab(tab);
		// 		})
		// 	})
		// 	menu.showAtMouseEvent(e);
		// }
		headIcon.onclick = (e) => {
			this.closeBookTab(tab);
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
		// console.log("close tab:",tab)
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

		if (this.callbacks?.onClose) {
			this.callbacks.onClose();
		}
	}


	// TODO: define annotation interface
	private onAddAnnotation(viewer: DocumentViewer, annot: any) {
		console.log("add annot:",annot);
	}

	private onModifyAnnotation(viewer: DocumentViewer, annot: any) {
		// console.log("modify annot:",annot);
	}

	private onDeleteAnnotation(viewer: DocumentViewer, annot: any) {
		// console.log("delete annot:",annot);
	}


	// TODO: move to DocumentViewer ??
	private async onCopyAnnotation(viewer: DocumentViewer, annot: any, ctrlKey: boolean) {

		const annoType = annot.tagName;
		const annoId = annot.getAttr("name");
		const annoRect = annot.getAttr("rect")
		const annoPage = Number(annot.getAttr("page")) + 1;



		const link = `obsidian://bookmaster?type=open-book&bid=${viewer.bid}&aid=${annoId}&page=${annoPage}`;

		var annoContent = "";
		var template = null;
		var isTextAnnot = false;
		if (["highlight","underline" ,"strikeout","squiggly","freetext"].includes(annoType)) {
			annoContent = annot.textContent;
			template = this.plugin.settings.annotationTemplate.textAnnotation;
			isTextAnnot = true;
		} else {
			template = this.plugin.settings.annotationTemplate.regionAnnotation;
		}

		var comment = "";
		if (template.includes("comment")) {
			comment = viewer.getAnnotationComment(annot) || "";
		}
	


		var clipWidth = 0;
		var clipHeight = 0;
		const realZoom = this.plugin.settings.fixedAnnotationImageScale;
		var imgName = "";

		if (template.includes("{{img}}") || template.includes("{{width}}") || template.includes("{{height}}")) {
			const clipBox = annoRect.split(",").map((t:string) => Number(t));

			clipWidth = Math.round((clipBox[2] - clipBox[0])*realZoom);
			clipHeight = Math.round((clipBox[3] - clipBox[1])*realZoom);

			if (template.includes("{{img}}")) {
				const image = await viewer.getAnnotationImage(annot,clipBox,realZoom);
				if (image) {
					imgName = await this.plugin.saveBookAnnotationImage(viewer.bid,annoId,image);
				} else {
					new Notice("无法获取标注图片图片");
				}
			}
		}

		var annoColor = "";
		if (template.includes("{{color}}")) {
			const hexColor = annot.getAttr("color");
			const r = parseInt(hexColor.substr(1,2),16);
			const g = parseInt(hexColor.substr(3,2),16);
			const b = parseInt(hexColor.substr(5,2),16);
			annoColor = `${r},${g},${b}`;
		}

		

		
		const params = {
			url: link,
			page: annoPage.toString(),
			color: annoColor,
			content: annoContent,
			width: clipWidth.toString(),
			height: clipHeight.toString(),
			img: imgName,
			comment: comment
		}

		const result = utils.encodeTemplate(template,params)
		navigator.clipboard.writeText(result);

		if (ctrlKey) {
			this.plugin.tryInsertTextToActiveView(result);
		} else {
			new Notice("标注已复制",600);
		}
	}

	private async onSaveAnnotaions(viewer: DocumentViewer) {
		const annotations = viewer.exportAnnotations();
		return this.plugin.saveBookAnnotations(viewer.bid,annotations);
	}

	private onCloseViewer(viewer: DocumentViewer) {

	
	}


	async openBook(bid: string,state?: any) {
		for(var i = 0; i < this.bookTabs.length; i++) {
			const tab = this.bookTabs[i];
			if (tab.bid === bid) {
				this.showBookTab(tab);
				tab.viewer.setState(state);
				this.setTitle(tab.title)
				return;
			}
		}


		return Promise.all([this.plugin.getBookById(bid),this.plugin.loadBookAnnotations(bid)]).then((value) => {
			const book = value[0];
			const annotations = value[1];
			if (!book) {
				throw "cant open book with bid:"+bid;
			};

			if (PDFTronViewer.isSupportedExt(book.ext)) {
				return this.plugin.getBookData(book).then((data: ArrayBuffer) => {
					const tab = this.addBookTab(bid,book.meta.title || book.name,book.ext);
					tab.book = book; // TODO: save book ref??
					const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "//webviewer";
					tab.viewer = new PDFTronViewer(bid,tab.container,workerPath,this.callbacks);
					tab.viewer.show(data,state,book.ext,annotations);
				});
			
			} else if (book.ext === "txt") {
				return this.plugin.getBookData(book).then((data: ArrayBuffer) => {
					const tab = this.addBookTab(bid,book.meta.title || book.name,book.ext);
					tab.book = book;
					
					tab.viewer = new TxtViewer(bid,tab.container);
					tab.viewer.show(data,state,book.ext);
				});
			} 
			else {

				var type = book.ext;
				if (ImageExts.includes(book.ext)) type = "image";
				else if (AudioExts.includes(book.ext)) type = "audio";
				else if (VideoExts.includes(book.ext)) type = "video";

				const tab = this.addBookTab(bid,book.meta.title || book.name, type);
				tab.book = book; // TODO: save book ref??
				const url = this.plugin.getBookUrl(book);

				if (book.ext === "html") {
					tab.viewer = new HtmlViewer(bid,tab.container);
				} else if (book.ext === "epub") {
					const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/epubjs-reader/reader/index.html";
					tab.viewer = new EpubJSViewer(bid, tab.container,workerPath);
				} else if(ImageViewer.isSupportedExt(book.ext)) {
					tab.viewer = new ImageViewer(bid, tab.container);
				} else if (AudioViewer.isSupportedExt(book.ext)) {
					tab.viewer = new AudioViewer(bid,tab.container);
				} else if (VideoViewer.isSupportedExt(book.ext)) {
					tab.viewer = new VideoViewer(bid,tab.container);
				}

				if (tab.viewer) {
					return tab.viewer.show(url,state,book.ext);
				} else {
					console.error("unvalid book:",book.ext,book);
					throw "unvalid book:"+book.path;
				}
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
