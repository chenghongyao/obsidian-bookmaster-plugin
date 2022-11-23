import { WorkspaceLeaf } from "obsidian";
import { DocumentViewer, DocumentViewerTheme } from "./documentViewer";
import * as utils from "../utils"


interface TxtViewerState {

}

export default class HtmlViewer extends DocumentViewer {

    state: TxtViewerState;
    workerPath: string;
    listener: any;
	eventHandlerMap: any;
    viewerReady: boolean;

    exportAnnotations(): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationComment(annot: any): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationImage(annot: any, clipBox: number[], zoom: number): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }


    constructor(bid:string, container: HTMLElement, theme: DocumentViewerTheme,  workerPath: string, eventCallBack: Function) {
        super(bid, container, theme, eventCallBack);
        this.workerPath = workerPath;


        this.eventHandlerMap = {
			viewerLoaded(data: any) {
				console.log("[txt]viewer ready");
				self.viewerReady = true;
			},
        };
        const self = this;
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

    async show(data: ArrayBuffer, state?: any, ext?: string, annotation?: string) {
        if (typeof data === "string") {
            throw new Error("unvalid data format.");
        } else {
            this.container.createEl("iframe",{
                attr: {
                src: this.workerPath + `?id=${this.viewerId}`,
                width: "100%",
                height: "100%",
                frameborder:0
            },

            });

            return this.postViewerWindowMessage("openFile",{
                content: data,
            });
        }

    }

    setState(state: TxtViewerState): void {

    }

    getState(): TxtViewerState {
        return this.state;
    }

    close(): void {
        window.removeEventListener("message", this.listener);
    }
}
    