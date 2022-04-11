



export abstract class DocumentViewer {
    container: HTMLElement;
    viewerId: string;

    constructor(container: HTMLElement) {
        this.container = container;
        this.viewerId = (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }

    abstract show(data: ArrayBuffer,state?: any, ext?: string): Promise<void>;
    abstract closeDocument(): Promise<void>;
    abstract getState(): any;

}