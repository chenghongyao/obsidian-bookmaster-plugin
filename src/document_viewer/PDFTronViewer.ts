import { debounce, loadPdfJs, Notice } from "obsidian";
import { DocumentViewer, DocumentViewerState, DocumentViewerTheme } from "./documentViewer";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";
import { ImageExts } from "../constants";

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

interface PDFTronViewerState {
    page: number;
	aid?: string;
    progress?: number;
}


export default class PDFTronViewer extends DocumentViewer {
    
	author: string;
    workerPath: string;
    listener: any;
	eventHandlerMap: any;
    viewerReady: boolean;
    documentReady: boolean;

    xfdfDoc: Document;
	annotsDoc: Element;
    annotsChanged: boolean;
	pageMtxMap: Map<String,Array<number>>;

    data: ArrayBuffer;
    ext: string;
    private pdfjsDoc: PDFDocumentProxy;
	private image: ImageBitmap;

    state: PDFTronViewerState;

    constructor(bid: string, container: HTMLElement, theme: DocumentViewerTheme, author: string, workerPath: string, eventCallback: Function) {
        super(bid, container, theme, eventCallback);
        this.workerPath = workerPath;
		this.author = author;
		
        this.setTheme(theme);
        this.viewerReady = false;
		this.documentReady = false;

        this.xfdfDoc = null;
		this.annotsDoc = null;
		this.pageMtxMap = new Map<String,Array<number>>;

		this.annotsChanged = false;
		this.state = {page: 0};
        const self = this;
		this.eventHandlerMap = {
			viewerLoaded(data: any) {
				console.log("[webviewer]viewer ready");
				if (self.viewerReady) {
					// console.error("viewer reload!!")
					self.show(self.data,self.getState(),self.ext,self.exportAnnotations());
				}
				self.viewerReady = true;
			},
			documentLoaded(data: any) {
				console.log("[webviewer]document loaded");

				self.xfdfDoc = self.parseXfdfString(data);
				self.annotsDoc = self.xfdfDoc.getElementsByTagName("annots")[0];
				console.log(self.xfdfDoc)
				var pagesDoc = self.xfdfDoc.getElementsByTagName("pages")[0];
				console.log(pagesDoc)

				if (pagesDoc) {
					self.pageMtxMap.set("default", 
											pagesDoc.getElementsByTagName("defmtx")[0].getAttr("matrix").split(",").map((t:string) => Number(t))
					)

					var pagesMtx = pagesDoc.getElementsByTagName("pgmtx")
					for(var i = 0; i < pagesMtx.length; ++i) {
						var mtx = pagesMtx[i].getAttr("matrix").split(",").map((t:string) => Number(t))
						self.pageMtxMap.set(pagesMtx[i].getAttr("page"), mtx)
					}
		
				}

				self.annotsChanged = false;
				self.documentReady = true;
			},

			pageNumberUpdated(page: number) {
                self.state.page = page;
				self.eventCallback("progress-update", {progress: page});
			},

			annotationChanged(data: any) {

				const annotsChanged = self.parseXfdfString(data.xfdf);
				const annotsAdd = annotsChanged.getElementsByTagName("add")[0].children;
				const annotsModify = annotsChanged.getElementsByTagName("modify")[0].children;
				const annotsDelete = annotsChanged.getElementsByTagName("delete")[0].children;

				
				const saveRequest = annotsAdd.length || annotsModify.length || annotsDelete.length;

				for(var i = 0; i < annotsAdd.length; i++) {
					if (annotsAdd[i].tagName === "custom") continue; // what is custom??
					self.eventCallback("add-annotation", annotsAdd[i]);
					self.annotsDoc.appendChild(annotsAdd[i]);
				}

				for(var i = 0; i < annotsModify.length; i++) {
					self.eventCallback("modify-annotation", annotsModify[i]);
					self.xfdfDoc.getElementsByName(annotsModify[i].getAttr("name"))[0].replaceWith(annotsModify[i]);
				
				}
				
				for(var i = 0; i < annotsDelete.length; i++) {
					self.eventCallback("delete-annotation", annotsDelete[i]);
					self.xfdfDoc.getElementsByName(annotsDelete[i].textContent)[0].remove();
					
				}


				// if (saveRequest) {
				// 	self.requestSaveAnnotations(false);
				// }
				
			},

			copyAnnotationLink(data: any) {
				const id = data.id;
				const annot = self.xfdfDoc.getElementsByName(id)[0]; // FIXME: not exists??
				console.log(annot)
				if (annot && self.eventCallback) {
					self.eventCallback("copy-annotation", {
						annot: annot,
						ctrl: data.ctrlKey,
					})
				}

				
			},

		};
		
	
        this.listener = function(event: any) {
            const data = event.data;
            if (!data["app"] || data["app"] !== self.viewerId)return;
            const handler = self.eventHandlerMap[data.type];
            if (handler) handler(data.data);
            
        }
        window.addEventListener("message", this.listener);



		
		WebViewer({
            path: this.workerPath,
            config: this.workerPath+"/config.js",

            custom: JSON.stringify({
                id: this.viewerId,
				theme: this.translateTheme(this.theme),
				author: this.author || "Guest",
            }),
            preloadWorker: "pdf",
        }, this.container);
    }

    private translateTheme(theme: DocumentViewerTheme) {
		var th,bgcolor;
		if (theme.startsWith("dark")) {
			th = "dark";
		} else if (theme.startsWith("light")) {
			th = "light";
		} else {
			th = "light"
		}

		if (theme.endsWith("-yellow")) {
			bgcolor = "rgb(242,235,217)";
		} else if (theme.endsWith("-green")) {
			bgcolor = "rgb(205,222,194)";
		} else {
			bgcolor = "rgb(255,255,255)";
		}

		return {
			theme: th,
			bgcolor: bgcolor
		}
	}
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
    private parseXfdfString(xfdfString: string) {
		return new DOMParser().parseFromString(xfdfString,'text/xml');	
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
	private async loadImageData(data:ArrayBuffer) {
		this.image = await createImageBitmap(new Blob([data],{type:"image/png"}))
	}


	private showAnnotation(aid: string) {
		this.postViewerWindowMessage("showAnnotation", aid);
	}

	private showBookPage(page: number) {
		this.postViewerWindowMessage("showBookPage", page);
	}

    async show(data: ArrayBuffer | string, state?: any, ext?: string, annotations?: string) {
        this.data = data as ArrayBuffer;



		this.ext = ext || "pdf";
        const arr = new Uint8Array(this.data);
        const blob = new Blob([arr], { type: 'application/'+this.ext });
        this.postViewerWindowMessage("openFile",{
            blob:blob,
            xfdfString: annotations,
            extension: this.ext,
            page: state?.page,
        });


		if (this.ext === "pdf") {
			this.loadPdfjsDoc(data as ArrayBuffer);
		} else if (ImageExts.includes(this.ext)) {
			this.loadImageData(data as ArrayBuffer);
		}
		
		const self = this;
		return new Promise<void>((resolve,reject) => {
			function wait() {
				if(!self.documentReady) {
					setTimeout(wait,100);
				} else {
					self.setState(state);
					resolve();
				}
			}
			wait();
		});
    }

    close(): void {
        this.data = null;
        window.removeEventListener("message", this.listener);
    }

    setState(state: PDFTronViewerState): void {
        if (!state) return;

        if (state.aid) {
			this.showAnnotation(state.aid);
		} else if (state.page) {
			this.showBookPage(state.page);
		} else if (state.progress) {
			this.showBookPage(state.progress);
		}
    }

    getState(): PDFTronViewerState {
        return this.state;
    }


    // setTheme(theme: DocumentViewerTheme): void {
        
    // }


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

	private async getPDFAnnotationImage(annot: any, clipBox: Array<number>, zoom: number): Promise<ArrayBuffer>{

		// const annoRect = annot.getAttr("rect")
		const annoPage = Number(annot.getAttr("page")) + 1;

		let mtx = this.pageMtxMap.get(annot.getAttr("page")) || this.pageMtxMap.get("default")
		console.log( this.pageMtxMap)


		if (mtx) {
			clipBox[0] = clipBox[0] + mtx[4]
			clipBox[1] = mtx[5] - clipBox[1]

			clipBox[2] = clipBox[2] + mtx[4]
			clipBox[3] = mtx[5] - clipBox[3]
		}

		console.log("mtx:", mtx)

		const clipWidth = (clipBox[2] - clipBox[0])*zoom;
		const clipHeight = (clipBox[1] - clipBox[3])*zoom;
		const clipLeft = clipBox[0]*zoom;
		const clipTop = clipBox[3]*zoom;


		return this.pdfjsDoc.getPage(annoPage).then((page: any) => {
			
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
							resolve(buf);
						})
					},"image/png",1);
				});

			

			});
			
		});


	}


	private async getImageAnnotationImage(annot: any, clipBox: Array<number>, zoom: number) : Promise<ArrayBuffer>{

		const clipWidth = Math.round((clipBox[2] - clipBox[0]));
		const clipHeight = Math.round((clipBox[3] - clipBox[1]));

		// console.log(clipBox[0],clipBox[1],clipWidth,clipHeight)
		return createImageBitmap(this.image,clipBox[0],clipBox[1],clipWidth,clipHeight).then((clipImage) => {
				
				//https://stackoverflow.com/questions/52959839/convert-imagebitmap-to-blob
			return new Promise(res => {
				// create a canvas
				const canvas = document.createElement('canvas');
				// resize it to the size of our ImageBitmap
				canvas.width = clipImage.width;
				canvas.height = clipImage.height;
				// try to get a bitmaprenderer context
				let ctx = canvas.getContext('bitmaprenderer');
				if(ctx) {
					// transfer the ImageBitmap to it
					ctx.transferFromImageBitmap(clipImage);
				}
				else {
					// in case someone supports createImageBitmap only
					// twice in memory...
					canvas.getContext('2d').drawImage(clipImage,0,0);
				}

				// get it back as a Blob
				canvas.toBlob((blob) => {
					blob.arrayBuffer().then(buf => {
						res(buf);
					})
				},"image/"+this.ext,1);

			})
		});

	}
	async getAnnotationImage(annot: any, clipBox: Array<number>, zoom: number) : Promise<ArrayBuffer>{
		if (this.ext === "pdf" && this.pdfjsDoc) {
			return this.getPDFAnnotationImage(annot,clipBox,zoom)
		} else if (this.image) {
			return this.getImageAnnotationImage(annot,clipBox,zoom);
		}

		return null;
	}

	exportAnnotations(): string {
		return this.xfdfDoc ? new XMLSerializer().serializeToString(this.xfdfDoc) : "";
	}

}