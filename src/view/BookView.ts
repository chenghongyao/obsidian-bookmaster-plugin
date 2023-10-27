import { debounce, ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";

import { AbstractBook, Book, BookFolder, BookFolderType, BookStatus} from "../Book";

import { BookVaultManager } from "src/BookVault";
import { DocumentViewer, DocumentViewerTheme } from "../document_viewer/DocumentViewer";
import PDFTronViewer from "../document_viewer/PDFTronViewer";
import EpubJSViewer from "../document_viewer/EPUBJSViewer";

import BasicBookSettingModal from "./BasicBookSettingModal";

import BookMasterPlugin from "../main";
import * as utils from "../utils"
import TxtViewer from "../document_viewer/TxtViewer";
import exportPDFAnnotation from "../utils/PdfAnnotation";


export const VIEW_TYPE_BOOK_VIEW = "bm-book-view"
export class BookView extends ItemView {
	plugin: BookMasterPlugin;
    bookVaultManager: BookVaultManager;
    bid: string;
    book: Book;
    viewer: DocumentViewer;
    debounceSaveAnnotation: any;
    debounceUpdateProgress: any;
    
    actAutoInsert: HTMLElement;
    actBookStatus: HTMLElement;
    actExportBook: HTMLElement;
    constructor(leaf: WorkspaceLeaf, plugin: BookMasterPlugin) {
        super(leaf);
		this.plugin = plugin;
        this.navigation = false;
        this.bookVaultManager = this.plugin.bookVaultManager;

        this.bid = null;
        this.viewer = null;


		this.debounceSaveAnnotation = debounce(() => {
			this.plugin.bookVaultManager.saveBookAnnotations(this.book, this.viewer.exportAnnotations());
		}, 2000, true);

        this.debounceUpdateProgress = debounce((params: any) => {
            if (this.book) {
                this.book.meta["progress"] = params.progress;
                this.bookVaultManager.saveBookDataSafely(this.book);
            }
		}, 1000, true);
    }

    getDisplayText() {
        if (this.book) {
            return this.book.meta.title || this.book.name;
        } else {
            return "Empty Book";
        }
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
		this.contentEl.addClass("bm-bookview");

        this.contentEl.onNodeInserted(() => {
            if (this.book) {
                this.setTitle(this.book.meta.title || this.book.name);
            }
        }, false)


        this.addAction("gear","设置",(evt) => {
            if (!this.book) return;
            new BasicBookSettingModal(this.app,this.plugin,this.book).open();
        });   

        this.actBookStatus = this.addAction("book-open-check","阅读状态",(evt) => {
            if (!this.book) return;

            const menu = new Menu();
            const allStatus = [BookStatus.UNREAD,BookStatus.READING,BookStatus.FINISHED];
			const statusIcon = ["scan-line","scan","scan-face"]
			const statusName = ["未读","在读","已读"];
            const bookStatus = allStatus.includes(this.book.meta["status"]) ? this.book.meta["status"] : BookStatus.UNREAD;
			for (let ind in allStatus) {
				const status = allStatus[ind];
                menu.addItem((item) => {
                    item
                    .setTitle("设为"+statusName[ind])
                    .setIcon(statusIcon[ind])
                    .onClick(()=>{
                        this.book.meta["status"] = status;							
                        this.bookVaultManager.saveBookDataSafely(this.book).then(() => {
                            new Notice("设置成功");
                        }).catch((reason)=>{
                            new Notice("设置失败:\n"+reason);
                        });
                    })

                    item.setChecked(status == bookStatus);

                
                });

			}

            menu.showAtMouseEvent(evt);

        });

        this.actExportBook = this.addAction("arrow-down","导出标注后文件", async (evt) => {
            if (!this.book) return;
            return this.plugin.exportAnnotatedFile(this.book);
        });



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
            if (this.plugin.settings.autoInsertNewAnnotation) {
                this.onCopyAnnotation(params, true)
            }

            this.debounceSaveAnnotation();
        } else if (event == "modify-annotation") {
            this.debounceSaveAnnotation();
        } else if (event == "delete-annotation") {
            this.debounceSaveAnnotation();
        } else if (event == "progress-update") {
            this.debounceUpdateProgress(params);
        } else if (event == "translate") {
            this.onTranslate(params.text);
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
		if (["highlight","underline" ,"strikeout","squiggly","freetext","text"].includes(annoType)) {
			annoContent = annot.textContent.replaceAll('\n','');
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
                    imgName = await this.bookVaultManager.saveBookAnnotationImage(this.book,annoId, image);
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
            title: this.book.meta.title || this.book.name,
		}

		const result = utils.encodeTemplate(template,params)
		navigator.clipboard.writeText(result);
        
		if (ctrlKey) {
			this.plugin.tryInsertTextToActiveView(result);
		} else {
			new Notice("标注已复制",600);
		}
    }

    private async onCopyPageLink(page: number) {
		const annoPage = page;

		const link = `obsidian://bookmaster?type=open-book&bid=${this.bid}&page=${annoPage}`;

		var template = this.plugin.settings.annotationTemplate.pdf.pageAnnotation;;
	
		const params = {
			url: link,
			page: annoPage.toString(),
            title: this.book.meta.title || this.book.name,
		}

		const result = utils.encodeTemplate(template,params)
		navigator.clipboard.writeText(result);
        
	
        new Notice("已复制",600);
    }

    private async onTranslate(text: string) {
        return this.plugin.translate(text);
    }

    async openBook(bid: string, state?: any) {

        this.bid = bid;
        this.book = await this.bookVaultManager.getBookById(this.bid); // TODO: validate book
        const annos = await this.bookVaultManager.loadBookAnnotations(this.book);
        
        this.book.view = this;
        this.setTitle(this.book.meta.title || this.book.name);

        const theme = this.plugin.settings.documentViewerTheme;
        if (this.book.ext == "pdf") {
            this.actExportBook.style.display = "block";
        } else {
            this.actExportBook.style.display = "none";
        }


        if (["pdf"].includes(this.book.ext)) {
            return this.bookVaultManager.getBookContent(this.book).then((data: ArrayBuffer) => {
                const workerPath = this.plugin.getCurrentDeviceSetting().bookViewerWorkerPath + "/webviewer";
                this.viewer = new PDFTronViewer(bid, this.contentEl, theme, this.plugin.settings.annotationAuthor, workerPath, this.viewerEvent.bind(this));
                if (!state) {
                    state = {};
                } 
                state.progress = this.book.meta["progress"]
                this.viewer.show(data,state,this.book.ext,annos).then(() => {
                    if (!this.book.meta.total) {
                        this.book.meta.total = this.viewer.numPages;
                        this.bookVaultManager.saveBookDataSafely(this.book);
                    }
                })
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
        // console.log(this.viewer)
        if (this.viewer) {
            this.viewer.setState(state);
        } 
    }

    onPaneMenu(menu: Menu, source: string) {
        if (this.book) {


            menu.addItem((item) => {
                    item.setTitle("复制当前页链接")
                    .setIcon("link")
                    .onClick(() => {
                        const page = (this.viewer.getState() as any).page;
                        this.onCopyPageLink(page);

                    })
            });
        
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
                .setTitle("关闭其他")
                .setIcon("cross")
                .onClick(() => {
                    const leafs = app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW);
                    for (const leaf of leafs) {
                        if (leaf.view !== this) {
                            leaf.detach();
                        }
                    }
                })
            });

            menu.addItem((item) => {
                item
                .setTitle("关闭所有")
                .setIcon("cross")
                .onClick(() => {
                    const leafs = app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW);
                    for (const leaf of leafs) {                    
                        leaf.detach();
                    }
                })
            });

            menu.addSeparator()
            this.plugin.createBookContextMenu(menu, this.book);
        }
    }


    
}