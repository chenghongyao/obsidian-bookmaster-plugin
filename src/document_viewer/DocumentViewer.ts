


export enum DocumentViewerTheme {
    Dark = "dark",
    DarkYellow = "dark-yellow",
    DarkGreen = "dark-green",
    Light = "light",
    LightYellow = "light-yellow",
    LightGreen = "light-green",
}


export abstract class DocumentViewerState {

}

export abstract class DocumentViewer {
    bid: string;
    container: HTMLElement;
    viewerId: string;
    theme: DocumentViewerTheme;
    eventCallback: Function;
	numPages: number;

    constructor(bid: string, container: HTMLElement, theme: DocumentViewerTheme, callback: Function) {
        this.bid = bid;
        this.container = container;
        this.theme = theme;
        this.viewerId = (((1+Math.random())*0x10000)|0).toString(16).substring(1);
        this.eventCallback = callback;
    }

    async setTheme(theme: DocumentViewerTheme) {

    }

    setState(state: DocumentViewerState) {

    }

    getState() {
    }

    abstract show(data: ArrayBuffer | string,state?: any, ext?: string, annotations?: string): Promise<void>;


    close() {

    }


	abstract exportAnnotations(): string;

    // TODO: remove
    abstract getAnnotationComment(annot: any):string;

    abstract getAnnotationImage(annot: any, clipBox: Array<number>, zoom: number) : Promise<ArrayBuffer>;

}