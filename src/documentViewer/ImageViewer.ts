import { DocumentViewer } from "./documentViewer";


export class ImageViewer extends DocumentViewer {


    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
    }

    async show(url: string, state?: any, ext?: string){
        console.log(url);

        const container = this.container.createDiv();
        container.style.width = "100%";
        container.style.height = "100%";
        container.style.position = "relative";
        const img = container.createEl("img",{
            attr: {
                src: url,
            }
        })

        img.style.position = "absolute"
        img.style.top = "50%"
        img.style.left = "50%"
        img.style.transform = "translate(-50%,-50%)"
    }

    async closeDocument() {
    }

    getState() {
        throw new Error("Method not implemented.");
    }

}