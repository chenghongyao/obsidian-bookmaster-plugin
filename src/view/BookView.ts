import { debounce, ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { BookVaultManager } from "src/BookVault";
import { DocumentViewer, DocumentViewerTheme } from "../document_viewer/DocumentViewer";
import PDFTronViewer from "../document_viewer/PDFTronViewer";
import EpubJSViewer from "../document_viewer/EPUBJSViewer";

import BookMasterPlugin from "../main";
import * as utils from "../utils"
import TxtViewer from "../document_viewer/TxtViewer";


export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;
    bookVaultManager: BookVaultManager;
    bid: string;
    book: Book;
    viewer: DocumentViewer;
    debounceSaveAnnotation: any;
    debounceUpdateProgress: any;
    
    constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
        super(leaf);
		this.plugin = plugin;
        this.navigation = false;
        this.bookVaultManager = this.plugin.bookVaultManager;

        this.bid = null;
        this.viewer = null;


		this.debounceSaveAnnotation = debounce(() => {
			this.plugin.bookVaultManager.saveBookAnnotations(this.bid, this.viewer.exportAnnotations());
		}, 2000, true);

        this.debounceUpdateProgress = debounce((params: any) => {
            if (this.book) {
                this.book.meta["progress"] = params.progress;
                this.bookVaultManager.saveBookDataSafely(this.book);
            }
		}, 1000, true);
    }

    getDisplayText() {
		return "Empty Book";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_VIEW;
	}

	getIcon() {
		return "book";	
	}

    getState() {
        if (this.bid) {
            return {
                bid: this.bid,
                viewerState: this.viewer?.getState()
            };
        } else {
            return {};
        }
    }
    async setState(state: any) {
        if (state.bid) {
            if (this.plugin?.bookVaultManager.inited) {
                this.setStateTimeout(state, 0);
            } else {
                setTimeout(this.setStateTimeout.bind(this),500, state, 0);
            }
        }
    }
    private setStateTimeout (state: any, tryTimes: number) {
        if (this.plugin?.bookVaultManager.inited) {
            this.openBook(state.bid, state.viewerState);
        } else {
            setTimeout(this.setStateTimeout.bind(this),300, state, tryTimes + 1);
        }
    }
    private setTitle(title: string) {
        (this.leaf as any).containerEl.find(".view-header-title").innerText = title;
        (this.leaf as any).tabHeaderInnerTitleEl.innerText = title;
        (this.leaf as any).tabHeaderEl.ariaLabel = title;
    }

    
    async onOpen() {
		console.log("BookView Open");

        this.contentEl.empty();
        this.contentEl.style.padding = "0";
        this.containerEl.style.height = "100%";
        this.containerEl.style.width = "100%";
		this.contentEl.addClass("bm-bookview");

        this.contentEl.onNodeInserted(() => {
            if (this.book) {
                this.setTitle(this.book.meta.title || this.book.name);
            }
        }, false)
    }



    async onClose() {

        if (this.book) {
            this.book.view = null;
        }
        if (this.viewer) {
            this.viewer.close();
            this.viewer = null;
        }
        this.debounceSaveAnnotation = null;
    }


    private viewerEvent(event: string, params: any) {
        if (event === "copy-annotation") {
            this.onCopyAnnotation(params.annot, params.ctrl);
        } else if (event == "add-annotation") {
            this.debounceSaveAnnotation();
        } else if (event == "modify-annotation") {
            this.debounceSaveAnnotation();
        } else if (event == "delete-annotation") {
            this.debounceSaveAnnotation();
        } else if (event == "progress-update") {
            this.debounceUpdateProgress(params);
        } 
        else {
            console.warn("unknown event:", event, params)
        }
    }

    // TODO: annotation type
    private async onCopyAnnotation(annot: any, ctrlKey: boolean) {
        const annoType = annot.tagName;
		const annoId = annot.getAttr("name");
		const annoRect = annot.getAttr("rect")
		const annoPage = Number(annot.getAttr("page")) + 1;



		const link = `obsidian://bookmaster?type=open-book&bid=${this.bid}&aid=${annoId}&page=${annoPage}`;

		var annoContent = "";
		var template = null;
		var isTextAnnot = false;
		if (["highlight","underline" ,"strikeout","squiggly","freetext"].includes(annoType)) {
			annoContent = annot.textContent;
			template = this.plugin.settings.annotationTemplate.pdf.textAnnotation;
			isTextAnnot = true;
		} else {
			template = this.plugin.settings.annotationTemplate.pdf.regionAnnotation;
		}

		var comment = "";
		if (template.includes("comment")) {
			comment = this.viewer.getAnnotationComment(annot) || "";
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
				const image = await this.viewer.getAnnotationImage(annot,clipBox,realZoom);
				if (image) {
					imgName = await this.bookVaultManager.saveBookAnnotationImage(this.bid,annoId,Buffer.from(image));
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
			comment: comment, // TODO: add all book meta fields
		}

		const result = utils.encodeTemplate(template,params)
		navigator.clipboard.writeText(result);
        
		if (ctrlKey) {
			this.plugin.tryInsertTextToActiveView(result);
		} else {
			new Notice("标注已复制",600);
		}
    }

    async openBook(bid: string, state?: any) {

        this.bid = bid;
        this.book = await this.bookVaultManager.getBookById(this.bid); // TODO: validate book
        const annos = await this.bookVaultManager.loadBookAnnotations(bid);
        
        this.book.view = this;
        this.setTitle(this.book.meta.title || this.book.name);

        const theme = this.plugin.settings.documentViewerTheme;
        
        if (["pdf"].includes(this.book.ext)) {
            return this.bookVaultManager.getBookContent(this.book).then((data: ArrayBuffer) => {
                const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/webviewer";
                this.viewer = new PDFTronViewer(bid, this.contentEl, theme, this.plugin.settings.annotationAuthor, workerPath, this.viewerEvent.bind(this));
                if (!state) {
                    state = {};
                } 
                state.progress = this.book.meta["progress"]
                this.viewer.show(data,state,this.book.ext,annos);
            });
        } else if (this.book.ext === "epub") {

            return this.bookVaultManager.getBookContent(this.book).then((data: ArrayBuffer) => {
                // const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/epubjs_release/input  .html";
                // const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/epubjs-reader/reader/index.html";
                this.viewer = new EpubJSViewer(bid, this.contentEl, theme, "", this.viewerEvent.bind(this));
                if (!state) {
                    state = {};
                } 
                state.progress = this.book.meta["progress"]
                this.viewer.show(data,state,this.book.ext,annos);
            });

            // const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/epubjs-reader/reader/index.html";
            // this.viewer = new EpubJSViewer(bid, this.contentEl, theme, workerPath, this.viewerEvent.bind(this)); 
            // // const url = this.bookVaultManager.getBookUrl(book);
            // // const url = "app://local/D:/我的书库/其他/金字塔原理2.epub"
            // // const url = "http://127.0.0.1/%E6%88%91%E7%9A%84%E4%B9%A6%E5%BA%93/%E5%85%B6%E4%BB%96//金字塔原理2.epub"
            // this.viewer.show(url,state,book.ext)
        } else if (this.book.ext === "html") {
            const url = this.bookVaultManager.getBookUrl(this.book);
            state = {url: url};
            this.leaf.setViewState({ type: "web-browser-view", active: true, state});
        } else if (this.book.ext === "txt") {
            return this.bookVaultManager.getBookContent(this.book).then((data: ArrayBuffer) => {
                const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/txtviewer/index.html";
                this.viewer = new TxtViewer(bid, this.contentEl, theme, workerPath, this.viewerEvent.bind(this));
                if (!state) {
                    state = {};
                } 
                state.progress = this.book.meta["progress"]
                this.viewer.show(data,state,this.book.ext,annos);
            });

        }
        else {
            new Notice("无法打开文件");
            this.leaf.detach();
        }

    }

    setViewerState(state: any) {
        this.viewer.setState(state);
    }

    onPaneMenu(menu: Menu, source: string) {
        if (this.book) {
            this.plugin.createBookContextMenu(menu, this.book);
            menu.addItem((item) => {
                item
                .setTitle("关闭")
                .setIcon("cross")
                .onClick(() => {
                    this.leaf.detach();
                })
            });
        }
    }
    
}