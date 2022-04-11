import { DocumentViewer } from "./documentViewer";
import WebViewer, { WebViewerInstance } from "@pdftron/webviewer";



export class PDFTronViewer extends DocumentViewer {
    
    listener: any;
	eventHandlerMap: any;
	viewerReady: boolean;
	documentReady: boolean;


	currentPage: number;
    workerPath: string;

    constructor(container: HTMLElement, workerPath: string) {
        super(container);

        this.workerPath = workerPath;

		this.viewerReady = false;
		this.documentReady = false;

		this.currentPage = 0;


        const self = this;
		this.eventHandlerMap = {
			viewerLoaded(data: any) {
				console.log("[webviewer]viewer ready");
				self.viewerReady = true;
			},
			documentLoaded(data: any) {
				console.log("[webviewer]document loaded");

				// self.xfdfDoc = self.plugin.parseXfdfString(data);
				// self.annotsDoc = self.xfdfDoc.getElementsByTagName("annots")[0];

				// self.isAnnotsChanged = false;
				self.documentReady = true;
			},

			pageNumberUpdated(page: number) {
				self.currentPage = page;
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

    async show(data: ArrayBuffer, state?: any, ext?: string){
        const arr = new Uint8Array(data);
        const blob = new Blob([arr], { type: 'application/'+ext });
        this.postViewerWindowMessage("openFile",{
            blob:blob,
            // xfdfString: xfdfString,
            // path: fullPath,
            extension: ext,
            page: state?.page,
        });

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
        // window.removeEventListener("message",this.listener);
		// this.viewerReady = false; 
		this.documentReady = false;
		this.currentPage = 0;
    }




}