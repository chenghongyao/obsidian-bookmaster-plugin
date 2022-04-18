import { DocumentViewer } from "./documentViewer";
import ePub,{Book as EPUBBook, Rendition}  from "epubjs" 


export class EpubJSViewer extends DocumentViewer {
    
    epubBook: EPUBBook;
    epubRedition: Rendition;
    workerPath: string;

    constructor(container: HTMLElement,workerPath: string) {
        super(container);
        this.workerPath = workerPath;
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
        }
        
        // this.epubBook = new EPUBBook();
        // return this.epubBook.open(data).then(() => {
        //     this.epubRedition = this.epubBook.renderTo(this.container,{
        //         // 默认双页显示
        //         width: '100%',
        //         height: '100%',

        //         // flow: "auto",
        //         // 单页滚动显示epub，推荐加上下面两个属性
        //         manager: "continuous",
        //         flow: "scrolled"
        //     });
        //     this.epubRedition.display();

        //     this.epubRedition.themes.register("light", {
        //         "body": {"background": "white"}
        //     });
        //     this.epubRedition.themes.register("gray",{
        //         "body": {"background": "rgb(190,190,190)"}
        //     });
        //     this.epubRedition.themes.register("dark",{
        //         "body": {"filter": "invert(100%)"}
        //     });

        //     this.epubRedition.themes.select("dark");


        // });

    }

    async closeDocument() {
        if (this.epubRedition) {
            this.epubRedition.destroy();
            this.epubRedition = null;
        }

        if (this.epubBook) {
            this.epubBook.destroy();
            this.epubBook = null;
        }
    }
    getState() {
        throw new Error("Method not implemented.");
    }
    
}