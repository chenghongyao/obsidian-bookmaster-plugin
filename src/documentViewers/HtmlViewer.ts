import { DocumentViewer } from "./documentViewer";


export class HtmlViewer extends DocumentViewer {

    iframe: HTMLIFrameElement;

    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
    }

    async show(url: string, state?: any, ext?: string){
        this.iframe = this.container.createEl("iframe",{
            attr: {
                src: url,
                width: "100%",
                height: "100%",
                frameborder:0
            },
            
        });
    }

    async closeDocument() {
        this.iframe = null;
    }

    getState() {
    }

	setState(state?: any): void {
	}

}