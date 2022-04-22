import { debounce } from "obsidian";




export abstract class DocumentViewer {
    bid: string;
    container: HTMLElement;
    viewerId: string;
    callbacks: any;
    state: any;
	isAnnotsChanged: boolean;
    private debounceSaveBookAnnotations: any;
    constructor(bid: string, container: HTMLElement,callbacks?: any) {
        this.bid = bid;
        this.container = container;
        this.callbacks = callbacks || {};
        this.viewerId = (((1+Math.random())*0x10000)|0).toString(16).substring(1);

        this.isAnnotsChanged = false;

        const self = this;
        this.debounceSaveBookAnnotations = debounce(()=>{
            self.requestSaveAnnotations(true);
		},3000,true);
    }

    setTheme(theme: string) {
        
    }

    exportAnnotations() : string{
        return "";
    }

    async getAnnotationImage(annot: any, clipBox: Array<number>, zoom: number): Promise<Buffer> {
        return null;
    }

    getAnnotationComment(annot: any): string {
        return null;
    }

    // getAnnotationParams(annot: any, template: string) {
    //     return {};
    // }
    
    requestSaveAnnotations(now: boolean) {
        if (now) {
            if (this.isAnnotsChanged && this.callbacks?.onSaveAnnotaions) {
                this.callbacks.onSaveAnnotaions(this).then(() => {
                    this.isAnnotsChanged = false;
                    // console.log("save annotations sucess:",this.bid);
                });
            }
        } else {
            this.isAnnotsChanged = true;
            this.debounceSaveBookAnnotations();    
        }
    }

    abstract setState(state?: any): void;

    abstract show(data: ArrayBuffer | string,state?: any, ext?: string, annotations?: string): Promise<void>;
    abstract closeDocument(): Promise<void>;
    abstract getState(): any;

}