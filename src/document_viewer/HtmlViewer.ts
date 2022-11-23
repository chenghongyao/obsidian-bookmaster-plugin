import { WorkspaceLeaf } from "obsidian";
import { DocumentViewer, DocumentViewerTheme } from "./documentViewer";
import * as utils from "../utils"


interface HtmlViewerState {

}

export default class HtmlViewer extends DocumentViewer {

    state: HtmlViewerState;
    url: string;
    leaf: WorkspaceLeaf;

    exportAnnotations(): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationComment(annot: any): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationImage(annot: any, clipBox: number[], zoom: number): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }


    constructor(bid:string, container: HTMLElement, leaf: WorkspaceLeaf, theme: DocumentViewerTheme, eventCallBack: Function) {
        super(bid, container, theme, eventCallBack);
        this.leaf = leaf;
    }

    async show(data: ArrayBuffer, state?: any, ext?: string, annotation?: string) {
        if (typeof data === "string") {
            this.url = data;

            if ((utils.app as any).viewRegistry.viewByType["web-browser-view"]) {
                state = {url: this.url};
                this.leaf.setViewState({ type: "web-browser-view", active: true, state});
            } else {

            }
        } else {
            throw new Error("unvalid data format.");
        }

    }

    setState(state: HtmlViewerState): void {

    }

    getState(): HtmlViewerState {
        return this.state;
    }

    close(): void {

    }
}
    