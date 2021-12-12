
import { ItemView, MarkdownEditView, MarkdownView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import WebViewer from "@pdftron/webviewer";
import BookNotePlugin from "./main";

import {clipPDF, getPDFDocFromData} from "./PDFHelper"
import { AbstractBook } from "./types";


export const VIEW_TYPE_BOOK_VIEW = "book-view";
export class BookView extends ItemView {
	plugin: BookNotePlugin;
	currentBook: AbstractBook;
	currentBookPath: string;

	listener: any;
	viewerReady: boolean;
	documentReady: boolean;
	viewerId: string;
	eventHandlerMap: any;
	headerTitleEl: Element;

	xfdfDoc: Document;
	annotsDoc: Element;
	isAnnotsChanged: boolean;

	// TODO: when needed??
	pdfjsDoc: any;

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf)
		this.plugin = plugin;
		this.viewerId = "wv-" + (this.leaf as any)?.id;
		this.viewerReady = false;
		this.documentReady = false;
		this.isAnnotsChanged = false;
		
		this.leaf.setPinned(true); //锁定避免被退出

		const self = this;
		this.eventHandlerMap = {
			viewerLoaded(data: any) {
				console.log("viewer ready");
				self.viewerReady = true;
			},
			documentLoaded(data: any) {
				self.xfdfDoc = self.plugin.parseXfdfString(data);
				self.annotsDoc = self.xfdfDoc.getElementsByTagName("annots")[0];

				self.isAnnotsChanged = false;
				self.documentReady = true;
			},
			
			copyAnnotationLink(data: any) {
				const id = data.id;
				const node = self.xfdfDoc.getElementsByName(id)[0];
				if (node) {
					self.getAnnotationLink(node,data.zoom || 1).then((content: string) => {
						navigator.clipboard.writeText(content);
						new Notice("回链已复制到剪贴板");
						if (data.ctrlKey || self.plugin.autoInsertAnnotationLink) {
							self.tryInsertAnnotationLink(content);
						}
				
					});

				} else {
					new Notice("标注id不存在");
				}
			},
			copyCurrentPageLink(data: any) {
				const link = encodeURI(`obsidian://booknote?type=open-book&book=${self.currentBookPath}&page=${data}`);
				let template = self.plugin.settings.currentPageLinkTemplage;
				template = template.replace(/\{\{page\}\}/g,data);
				template = template.replace(/\{\{url\}\}/g,link);
				navigator.clipboard.writeText(template);
				new Notice("回链已复制");
			},

			annotationChanged(data: any) {
				const annotsChanged = self.plugin.parseXfdfString(data.xfdf);
				const annotsAdd = annotsChanged.getElementsByTagName("add")[0].children;
				const annotsModify = annotsChanged.getElementsByTagName("modify")[0].children;
				const annotsDelete = annotsChanged.getElementsByTagName("delete")[0].children;
				
				
				if (!self.isAnnotsChanged && (annotsAdd.length || annotsDelete.length || annotsModify.length )) {
					self.isAnnotsChanged = true;
				}

				if (annotsAdd.length > 0 && (self.plugin.settings.copyNewAnnotationLink || self.plugin.autoInsertAnnotationLink)) {
					const node = annotsAdd[annotsAdd.length-1];

					self.getAnnotationLink(node,data.zoom || 1).then((content: string) => {
						if (self.plugin.settings.copyNewAnnotationLink) {
							navigator.clipboard.writeText(content);
						}

						if (self.plugin.autoInsertAnnotationLink) {
							self.tryInsertAnnotationLink(content);
						}
					});
				}

				for(var i = 0; i < annotsAdd.length; i++) {
					self.annotsDoc.appendChild(annotsAdd[i]);
				}
				for(var i = 0; i < annotsModify.length; i++) {
					self.xfdfDoc.getElementsByName(annotsModify[i].getAttr("name"))[0].replaceWith(annotsModify[i]);
				}
				
				for(var i = 0; i < annotsDelete.length; i++) {
					self.xfdfDoc.getElementsByName(annotsDelete[i].textContent)[0].remove();
				}



				
			}
		}
	}

	// TODO:last activate markdown view?? 
	tryInsertAnnotationLink(content: string) {
		if (this.app.workspace.activeLeaf.view.getViewType() === "markdown") { // insert to markdown
			(this.app.workspace.activeLeaf.view as MarkdownView).editor.replaceSelection(content);

		} else {
			new Notice("请先激活目标Markdown窗口");
		}
	}

	parseAnnotationContent(content: string) {
		return content.replace(/\n/g,"");
	}

	async getAnnotationLink(anno: Element, zoom: Number) {
		const annoType = anno.tagName;
		const annoId = anno.getAttr("name");
		const annoRect = anno.getAttr("rect");
		const annoPage = anno.getAttr("page");
		const link = encodeURI(`obsidian://booknote?type=annotation&book=${this.currentBookPath}&id=${annoId}&page=${annoPage}&rect=${annoRect}`);
		
		// TODO: declare moment??
		let template = "";
		let needComment = false;
		let textType = false;
		if (["highlight","underline" ,"strikeout","squiggly","freetext"].indexOf(annoType) >= 0) {
			template = this.plugin.settings.selectionAnnotationLinkTemplate;
			needComment = template.indexOf("{{comment}}") >= 0;
			template = template.replace(/\{\{content\}\}/g,this.parseAnnotationContent(anno.textContent));
			textType = true;
		} else {
			template = this.plugin.settings.regionAnnotationLinkTemplate;
			needComment = template.indexOf("{{comment}}") >= 0;
			textType = false;
		}

		
		if (template.indexOf("{{img}}") >= 0) {
			if (!this.pdfjsDoc) { // 只支持PDF
				new Notice("当前文件不支持截图");
			} else {
				const realZoom = this.plugin.settings.fixedAnnotImageZoom ? Number(this.plugin.settings.fixedAnnotImageZoomValue) : Number(zoom);
				const bookPath = this.currentBook.path;
				const bookDir = this.plugin.path.dirname(bookPath);
				const imgDir = bookDir === "." ? "(annots)"+this.currentBook.name : bookDir + "/(annots)" + this.currentBook.name;
				const imgPath = this.plugin.normalizeBooksDataPathOfVault(this.currentBook.vault, `${imgDir}/p${annoPage}r${annoRect}z${realZoom}i(${annoId}).png`);
				const clipBox = annoRect.split(",").map(t => Number(t));
		
				clipPDF(this.plugin, 
					realZoom,
					this.pdfjsDoc,Number(annoPage)+1,
					clipBox,
					imgPath);
	
				template = template.replace(/\{\{img\}\}/g,imgPath);
	
	
				// TODO:图像模糊，暂时通过设置宽度解决
				const clipWidth = Math.round((clipBox[2] - clipBox[0])*realZoom/1.2);
				const clipHeight = Math.round((clipBox[3] - clipBox[1])*realZoom/1.2);
				template = template.replace(/\{\{width\}\}/g,clipWidth.toString());
				template = template.replace(/\{\{height\}\}/g,clipHeight.toString());
			}
		}

		template = template.replace(/\{\{page\}\}/g,annoPage);
		template = template.replace(/\{\{url\}\}/g,link);

		// TODO: more comment!
		if (needComment) {
			if (textType) {
				const allReply = this.xfdfDoc.querySelector(`text[inreplyto="${annoId}"`)
				const commentEl = allReply ? allReply.getElementsByTagName("contents") : null;
				template = template.replace(/\{\{comment\}\}/g,commentEl.length ? commentEl[0].textContent : "");

			} else {
				const commentEl = anno.getElementsByTagName("contents");
				template = template.replace(/\{\{comment\}\}/g,commentEl.length ? commentEl[0].textContent : "");
			}
		}

		return template;
	}

	showAnnotation(id: string) {
		this.postViewerWindowMessage("showAnnotation", id);
	}

	showBookPage(page: Number) {
		this.postViewerWindowMessage("showBookPage", page);
	}
	
	sendCopyCurrentPageLinkRequest() {
		this.postViewerWindowMessage("copyCurrentPageLink");
	}

	getDisplayText() {
		return "Book View";
	}

	async openBook(book: AbstractBook, page?: Number) {

		const self = this;
		const promise = new Promise<BookView>((resolve,reject) => {
			
			if (self.currentBook && self.plugin.isSameBook(self.currentBook,book)) {
				if (!(page == null || page == undefined)) {
					self.showBookPage(page);
				}
				resolve(self);
				return;
			}

			// TODO: save annotations safely??
			if (self.xfdfDoc && self.isAnnotsChanged) {
				self.plugin.saveBookAnnotations(self.currentBook, self.xfdfDoc);
			}

			const fullPath = self.plugin.normalizeBooksPathOfVault(book.vault,book.path);
			if (!self.plugin.fs.existsSync(fullPath)) {
				new Notice("文件不存在:"+fullPath);
				reject("文件不存在");
			} else {

				self.plugin.getBookAnnotations(book).then(xfdfString => {
					
					self.plugin.fs.readFile(fullPath,(err: any, data: any) => {
						if (err) {
							new Notice("无法读取文件:"+fullPath);
							reject(err);
						} else {
							// TODO: good time to set title??
							if (self.currentBook) {
								self.plugin.bookViewMap.delete(self.currentBookPath);
							}
						
							self.pdfjsDoc = null;
							
							self.currentBook = book;
							self.currentBookPath = self.plugin.encodeBookPath(book);
							self.headerTitleEl.setText((book.attrs && book.attrs.title) || book.name);
							self.plugin.bookViewMap.set(self.currentBookPath,self);
							self.documentReady = false; 
	
							const arr = new Uint8Array(data);
							const blob = new Blob([arr], { type: 'application/'+book.ext });
							self.postViewerWindowMessage("openFile",{
								blob:blob,
								xfdfString: xfdfString,
								path: fullPath,
								extension: book.ext,
								page: page,
							});

							if (book.ext === "pdf") { //只支持pdf!!
								let cmap = null;
								if (self.plugin.settings.useLocalWebViewerServer) {
									cmap = "http://127.0.0.1:"+self.plugin.settings.webviewerLocalPort+"/pdfjs/web/cmaps/"
								} else {
									cmap = "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/cmaps/";
								}
								getPDFDocFromData(data,cmap).then(pdfDoc => {
									self.pdfjsDoc = pdfDoc;
								})
							}
							

							function waitDocumentReady() {
								if(!self.documentReady) {
									setTimeout(waitDocumentReady,100);
								} else {
									resolve(self);
								}
							}
							waitDocumentReady();				
						}

					});
				});
			}

			
		});

		return promise;
	}

	private getViewerWindow() {
		const self = this;
		const promise = new Promise<Window>((resolve,reject) => {
			function wait() {
				if(!self.viewerReady) {
					setTimeout(wait,100);
				} else {
					resolve((self.contentEl.children[0] as HTMLIFrameElement).contentWindow);
				}
			}
			wait();
		});
		return promise;
	}


	postViewerWindowMessage(type: string, data?: any) {
		this.getViewerWindow().then(window => {
			window.postMessage({
				app: "obsidian-book",
				type: type,
				data: data,
			},"*");
		})
	}
	

	getViewType() {
		return VIEW_TYPE_BOOK_VIEW;
	}

	async onOpen() {
		console.log("BookView Open");

		const self = this;
		this.contentEl.classList.add("webviewer-container");
		const workerPath = this.plugin.settings.useLocalWebViewerServer ? 
							"http://127.0.0.1:"+this.plugin.settings.webviewerLocalPort
							: this.plugin.settings.webviewerExternalServerAddress;

		WebViewer({
			path: workerPath,
			config: "config.js",
			custom: JSON.stringify({
				id: this.viewerId,
			}),
			preloadWorker: "pdf",
		},this.contentEl).then(instance => {
			
		});

		this.listener = function(event: any) {
			const data = event.data;
			if (!data["app"] || data["app"] !== self.viewerId)return;
			const handler = self.eventHandlerMap[data.type];
			if (handler) handler(data.data);
			
		}

		window.addEventListener("message", this.listener);

		this.headerTitleEl = this.containerEl.children[0].getElementsByClassName("view-header-title")[0];

		const actionsContainer = this.containerEl.children[0].children[2];
		const actionTemp = actionsContainer.children[0];

		// TODO: 模式切换icon
		const autoInsertEl = this.addAction("paper-plane","自动插入",()=> {
			self.plugin.autoInsertAnnotationLink = !self.plugin.autoInsertAnnotationLink;
			if (self.plugin.autoInsertAnnotationLink) {
				autoInsertEl.classList.add("bookview-action-active");
			} else {
				autoInsertEl.classList.remove("bookview-action-active");
			}
		});
		actionsContainer.insertBefore(actionTemp,autoInsertEl);

		actionsContainer.insertBefore(actionTemp,this.addAction("dice","占位",()=> {
			new Notice("广告位出租");
		}));
		actionsContainer.insertBefore(actionTemp,this.addAction("star","占位",()=> {
			new Notice("广告位出租");
		}));



		
	}

	async onClose() {
		console.log("BookView Close");

		// TODO: saved safely??
		if (this.xfdfDoc && this.isAnnotsChanged) {
			this.plugin.saveBookAnnotations(this.currentBook,this.xfdfDoc);
		}
		window.removeEventListener("message",this.listener);
		this.viewerReady = false; 
	}


	onMoreOptionsMenu(menu: Menu) {
		const self = this;
		menu.addItem((item) => {
			item.setTitle("复制当前页回链")
				.onClick((evt) => {
					self.sendCopyCurrentPageLinkRequest();
				})
		});

		menu.addSeparator();
		menu.addItem((item) => {
			item.setTitle("关闭其他")
				.onClick((evt) => {
					self.plugin.bookViewMap.forEach((view, key) => {
						if (view == self)return;
						view.leaf.detach();
						self.plugin.bookViewMap.delete(key);
					});
				})
		});

		menu.addItem((item) => {
			item.setTitle("关闭全部")
				.onClick((evt) => {
					self.plugin.bookViewMap.forEach((view, key) => {
						view.leaf.detach();
						self.plugin.bookViewMap.delete(key);
					});
				});
		});
	}

	
	onunload() {
		console.log("BookView unload");
		if (this.currentBook) {
			this.plugin.bookViewMap.delete(this.currentBookPath);
		}
	}

}