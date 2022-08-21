import { DocumentViewer } from "./documentViewer";
import ePub,{Book , Rendition}  from "epubjs" 


export class EpubJSViewer extends DocumentViewer {
    
    book: Book;
    redition: Rendition;
    workerPath: string;

    constructor(bid:string, container: HTMLElement,workerPath: string) {
        super(bid, container);
        this.workerPath = workerPath;
    }

    private navigatePage(e: KeyboardEvent) {
        if (!this.redition) return;


        if (e.key === "ArrowRight") {
            this.redition.next();
            console.log("next");
        } else if (e.key === "ArrowLeft") {
            this.redition.prev();
            console.log("prev");
        }
    }



    async show(data: ArrayBuffer | string, state?: any, ext?: string) {

        // const epub = ePub(data);
        // this.epubRedition = epub.renderTo(this.container);
        // this.epubRedition.display();

        if (typeof data === "string") {
            this.container.createEl("iframe",{
                attr: {
                    src: this.workerPath + "?bookPath=" + data,
                    width: "100%",
                    height: "100%",
                    frameborder:0
                },
                
            });

            // this.book = ePub(data);
            // this.redition = this.book.renderTo(this.container,{
            //     width: "100%",
            //     height: "100%",
            //     manager: "continuous",
            //     // snap: true
            //     flow: "scrolled",
            // });

            // this.redition.on("keydown",(e: KeyboardEvent) => {
            //     this.navigatePage(e);
            // });

            
            // this.redition.themes.register("light", {
            //     "body": {"background": "white"}
            // });
            // this.redition.themes.register("gray",{
            //     "body": {"background": "rgb(190,190,190)"}
            // });
            // this.redition.themes.register("dark",{
            //     "body": {"filter": "invert(100%)"}
            // });

            // this.redition.themes.select("dark");
            // return this.redition.display();

        } else {
            throw "unvalid data type for epub viewer";
        }


    }

    async closeDocument() {
        if (this.redition) {
            this.redition.destroy();
            this.redition = null;
        }

        if (this.book) {
            this.book.destroy();
            this.book = null;
        }
    }
    getState() {
    }

    setState(state?: any): void {
	}
    
}