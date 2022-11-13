import { debounce, ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import { Book } from "src/Book";
import { BookVaultManager } from "src/BookVault";
import { DocumentViewer, DocumentViewerTheme } from "../document_viewer/DocumentViewer";
import { PDFTronViewer } from "../document_viewer/PDFTronViewer";

import BookMasterPlugin from "../main";
import * as utils from "../utils"

export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;
    bookVaultManager: BookVaultManager;
    bid: string;
    viewer: DocumentViewer;
    debounceSaveAnnotation: any;
    
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
                viewer: this.viewer.getState()
            };
        } else {
            return {};
        }
    }
    async setState() {

    }

    private setTitle(title: string) {
        (this.leaf as any).tabHeaderInnerTitleEl.innerText = title;
    }

    async onOpen() {
		console.log("BookView Open");

        this.contentEl.empty();
        this.contentEl.style.padding = "0";
		this.contentEl.addClass("bm-bookview");

        this.contentEl.onNodeInserted(() => {
            const book = this.getBook();

            if (book) {
                this.setTitle(book.meta.title || book.name);
            }
        }, false)
    }

    getBook() {
        return this.bid && this.bookVaultManager.getBookById(this.bid);
    }

    async onClose() {

        const book = this.getBook();
        if (book) {
            book.view = null;
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
        } else {
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
        const book = this.getBook();
        const annos = await this.bookVaultManager.loadBookAnnotations(bid);
        
        book.view = this;
        this.setTitle(book.meta.title || book.name);

        const theme = this.plugin.settings.documentViewerTheme;
        
        if (["pdf"].includes(book.ext)) {
            return this.bookVaultManager.getBookContent(book).then((data: ArrayBuffer) => {
                const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/webviewer";
                this.viewer = new PDFTronViewer(bid, this.contentEl, theme, workerPath, this.viewerEvent.bind(this));
                this.viewer.show(data,state,book.ext,annos);
            });
        } else {
            new Notice("无法打开文件");
            this.leaf.detach();
        }

    }

    setViewerState(state: any) {
        this.viewer.setState(state);
    }

    onPaneMenu(menu: Menu, source: string): void {
        // console.log(menu);
        if (this.bid) {
            this.plugin.createBookContextMenu(menu, this.getBook())
        }
    }
    
}