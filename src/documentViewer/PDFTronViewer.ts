import { DocumentViewer } from "./documentViewer";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { loadPdfJs, Notice } from "obsidian";



/* PDFJS interface */
interface PDFPageProxy  {
    view: Array<number>;
    getViewport: Function;
    render: Function;
}

interface PDFDocumentProxy {
    numPages: number;
    getPage: Function;
}


export class PDFTronViewer extends DocumentViewer {
    
    listener: any;
	eventHandlerMap: any;
	viewerReady: boolean;
	documentReady: boolean;

	xfdfDoc: Document;
	annotsDoc: Element;

	currentPage: number;
    workerPath: string;

	ext: string;
	pdfjsDoc: any; // pdfDocument

    constructor(bid: string, container: HTMLElement, workerPath: string, callbacks?: any) {
        super(bid,container,callbacks);

        this.workerPath = workerPath;

		this.viewerReady = false;
		this.documentReady = false;

		this.currentPage = 0;

		this.xfdfDoc = null;
		this.annotsDoc = null;
		this.isAnnotsChanged = false;


        const self = this;
		this.eventHandlerMap = {
			viewerLoaded(data: any) {
				console.log("[webviewer]viewer ready");
				if (self.viewerReady) {
					console.error("viewer reload!!")
				}
				self.viewerReady = true;
			},
			documentLoaded(data: any) {
				console.log("[webviewer]document loaded");

				self.xfdfDoc = self.parseXfdfString(data);
				self.annotsDoc = self.xfdfDoc.getElementsByTagName("annots")[0];
				self.isAnnotsChanged = false;
				self.documentReady = true;
			},

			pageNumberUpdated(page: number) {
				self.currentPage = page;
			},

			annotationChanged(data: any) {

				const annotsChanged = self.parseXfdfString(data.xfdf);
				const annotsAdd = annotsChanged.getElementsByTagName("add")[0].children;
				const annotsModify = annotsChanged.getElementsByTagName("modify")[0].children;
				const annotsDelete = annotsChanged.getElementsByTagName("delete")[0].children;

				
				const saveRequest = annotsAdd.length || annotsModify.length || annotsDelete.length;

				for(var i = 0; i < annotsAdd.length; i++) {
					if (annotsAdd[i].tagName === "custom") continue; // what is custom??
					if (self.callbacks?.onAddAnnotation) {
						self.callbacks.onAddAnnotation(self, annotsAdd[i]);
					}
					self.annotsDoc.appendChild(annotsAdd[i]);
				}

				for(var i = 0; i < annotsModify.length; i++) {
					if (self.callbacks?.onModifyAnnotation) {
						self.callbacks.onModifyAnnotation(self, annotsModify[i]);
					}
					self.xfdfDoc.getElementsByName(annotsModify[i].getAttr("name"))[0].replaceWith(annotsModify[i]);
				
				}
				
				for(var i = 0; i < annotsDelete.length; i++) {
					if (self.callbacks?.onDeleteAnnotation) {
						self.callbacks.onDeleteAnnotation(self, annotsDelete[i]);
					}
					self.xfdfDoc.getElementsByName(annotsDelete[i].textContent)[0].remove();
					
				}


				if (saveRequest) {
					self.requestSaveAnnotations(false);
				}
				
			},

			copyAnnotationLink(data: any) {
				const id = data.id;
				const annot = self.xfdfDoc.getElementsByName(id)[0]; // FIXME: not exists??

				if (annot && self.callbacks?.onCopyAnnotation) {
					self.callbacks.onCopyAnnotation(self, annot,data.ctrlKey);
				}
			},

		};


        WebViewer({
            path: this.workerPath,
            config: this.workerPath+"/config.js",
            custom: JSON.stringify({
                id: this.viewerId,
            }),
            preloadWorker: "pdf",
        },this.container)
        this.listener = function(event: any) {
            const data = event.data;
            if (!data["app"] || data["app"] !== self.viewerId)return;
            const handler = self.eventHandlerMap[data.type];
            if (handler) handler(data.data);
            
        }
        window.addEventListener("message", this.listener);
    }


	exportAnnotations() {
		return this.xfdfDoc ? new XMLSerializer().serializeToString(this.xfdfDoc) : "";
	}

	private parseXfdfString(xfdfString: string) {
		return new DOMParser().parseFromString(xfdfString,'text/xml');	
	}

	static isSupportedExt(ext: string) {
		return [  "pdf",
		"xlsx","xls","doc","docx","ppt","pptx", // office
		"jpg","jpeg","png","bmp"].includes(ext);
	}

	private async getPDFAnnotationImage(annot: any, clipBox: Array<number>, zoom: number): Promise<Buffer>{

		// const annoRect = annot.getAttr("rect")
		const annoPage = Number(annot.getAttr("page")) + 1;
		const clipWidth = (clipBox[2] - clipBox[0])*zoom;
		const clipHeight = (clipBox[3] - clipBox[1])*zoom;
		const clipLeft = clipBox[0]*zoom;

		return this.pdfjsDoc.getPage(annoPage).then((page: any) => {
			const clipTop = (page.view[3] - clipBox[3])*zoom;
	
			const viewport = page.getViewport({
				scale: zoom,
				offsetX:-clipLeft,
				offsetY:-clipTop,
			});
			
			const canvas = document.createElement("canvas");
			const context = canvas.getContext('2d');
			canvas.height = clipHeight;
			canvas.width = clipWidth;
	
			const renderContext = {
				canvasContext: context,
				viewport: viewport
			};
			
		
			return page.render(renderContext).promise.then(() => {
				// TODO: more efficient??
				// TODO: image is blur??

				return new Promise((resolve,reject) => {
					canvas.toBlob((blob) => {
						blob.arrayBuffer().then(buf => {
							resolve(Buffer.from(buf));
						})
					},"image/png",1);
				});

			

			});
			
		});


	}

	async getAnnotationImage(annot: any, clipBox: Array<number>, zoom: number) : Promise<Buffer>{
		if (this.ext === "pdf" && this.pdfjsDoc) {
			return this.getPDFAnnotationImage(annot,clipBox,zoom)
		}

		return null;
	}

	// TODO: private??
	getAnnotationComment(annot: any): string {
		var commentEl = null;
		const annoType = annot.tagName;
		const annoId = annot.getAttr("name");
		if (["highlight","underline" ,"strikeout","squiggly","freetext"].includes(annoType)) {
			const allReply = this.xfdfDoc.querySelector(`text[inreplyto="${annoId}"`)
			commentEl = allReply ? allReply.getElementsByTagName("contents") : null;	
		}else {
			commentEl = annot.getElementsByTagName("contents");
		}
		return commentEl?.length ? commentEl[0].textContent : "";
	}

	// async getAnnotationParams(annot: any, annotTemplate: any, imageScale: number = 2) {

	// 	const annoType = annot.tagName;
	// 	const annoId = annot.getAttr("name");
	// 	const annoRect = annot.getAttr("rect")
	// 	const annoPage = Number(annot.getAttr("page")) + 1;



	// 	const link = `obsidian://bookmaster?type=annotation&bid=${this.bid}&aid=${annoId}&page=${annoPage}`;

	// 	var annoContent = "";
	// 	var template = null;
	// 	var isTextAnnot = false;
	// 	if (["highlight","underline" ,"strikeout","squiggly","freetext"].includes(annoType)) {
	// 		annoContent = annot.textContent;
	// 		template = annotTemplate.textAnnotation;
	// 		isTextAnnot = true;
	// 	} else {
	// 		template = annotTemplate.regionAnnotation;
	// 	}

	// 	var comment = "";
	// 	if (template.includes("comment")) {
	// 		comment = this.getAnnotationComment(annot) || "";
	// 	}
	


	// 	var clipWidth = 0;
	// 	var clipHeight = 0;
	// 	if (template.includes("{{width}}") || template.includes("{{height}}")) {
	// 		const clipBox = annoRect.split(",").map((t:string) => Number(t));
	// 		clipWidth = Math.round((clipBox[2] - clipBox[0])*imageScale);
	// 		clipHeight = Math.round((clipBox[3] - clipBox[1])*imageScale);
	// 	}

	// 	var annoColor = "";
	// 	if (template.includes("{{color}}")) {
	// 		const hexColor = annot.getAttr("color");
	// 		const r = parseInt(hexColor.substr(1,2),16);
	// 		const g = parseInt(hexColor.substr(3,2),16);
	// 		const b = parseInt(hexColor.substr(5,2),16);
	// 		annoColor = `${r},${g},${b}`;
	// 	}

	// 	var img: string|Buffer= "";
	// 	if (template.includes("{{img}}")) {
	// 		const image = await this.getAnnotationImage();
	// 		img = image ? image : "无法获取标注图片图片";
	// 	}

		
	// 	const params = {
	// 		link: link,
	// 		page: annoPage.toString(),
	// 		color: annoColor,
	// 		content: annoContent,
	// 		width: clipWidth.toString(),
	// 		height: clipHeight.toString(),
	// 		img: img,
	// 		comment: comment
	// 	}

	// 	return params;
	// }

    private getViewerWindow() {
		const self = this;
		return new Promise<Window>((resolve,reject) => {
			function wait() {
				if(!self.viewerReady) {
					setTimeout(wait,100);
				} else {
					resolve((self.container.children[0] as HTMLIFrameElement).contentWindow);
				}
			}
			wait();
		});
	}

    private postViewerWindowMessage(type: string, data?: any) {
		return this.getViewerWindow().then(window => {
			window.postMessage({
				app: "obsidian-book",
				type: type,
				data: data,
			},"*");

			
		})
	}

	private async loadPdfjsDoc(data: ArrayBuffer) {
		const pdfjsLib = await loadPdfJs();
		const loadingTask: Promise<PDFDocumentProxy> = pdfjsLib.getDocument({
			// cMapUrl: this.CMAP_URL,
			// cMapPacked: true,
			data: data,
		}).promise;

		return loadingTask.then((pdfjsDoc: any) => {
			this.pdfjsDoc = pdfjsDoc;
		}).catch((reason) => {
			new Notice("读取pdf文件错误,将无法截图:\n"+reason);
		});
	}

    async show(data: ArrayBuffer, state?: any, ext?: string, annotations?: string){

		this.ext = ext || "pdf";
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/'+this.ext });
        this.postViewerWindowMessage("openFile",{
            blob:blob,
            xfdfString: annotations,
            extension: this.ext,
            page: state?.page,
        });


		if (this.ext === "pdf") {
			this.loadPdfjsDoc(data);
		}
		


		const self = this;
		return new Promise<void>((resolve,reject) => {
			function wait() {
				if(!self.documentReady) {
					setTimeout(wait,100);
				} else {
					resolve();
				}
			}
			wait();
		});
    }


	getState() {
		return {page: this.currentPage};
	}

    async closeDocument() {

		if (this.isAnnotsChanged) {
			this.requestSaveAnnotations(true);
			this.isAnnotsChanged = false;
		}

		if (this.callbacks?.onClose) {
			await this.callbacks.onClose(this);
		}

		window.removeEventListener("message",this.listener);
		this.viewerReady = false; 


		this.pdfjsDoc = null;
		this.xfdfDoc = null;
		this.annotsDoc = null;
		this.documentReady = false;
		this.currentPage = 0;
    }




}