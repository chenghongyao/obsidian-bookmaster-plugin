import { DocumentViewer, DocumentViewerTheme } from "./documentViewer";
import ePub,{Book as EPUBBook , Rendition}  from "epubjs" 



interface EpubJSViewerState {

}

export default class EpubJSViewer extends DocumentViewer {
    
    workerPath: string;
    // listener: any;
	// eventHandlerMap: any;
    // viewerReady: boolean;
    // documentReady: boolean;
    

    rendition: Rendition;
    book: EPUBBook;
    epubContainer: HTMLDivElement;

    state: EpubJSViewerState;
    data: ArrayBuffer;

    exportAnnotations(): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationComment(annot: any): string {
        throw new Error("Method not implemented.");
    }
    getAnnotationImage(annot: any, clipBox: number[], zoom: number): Promise<ArrayBuffer> {
        throw new Error("Method not implemented.");
    }
    


    constructor(bid:string, container: HTMLElement, theme: DocumentViewerTheme, workerPath: string, eventCallBack: Function) {
        super(bid, container, theme, eventCallBack);
        this.workerPath = workerPath;

        const btnContainer = this.container.createDiv();
        btnContainer.style.display = "inline";
        const btnPrevEl = btnContainer.createEl("button");
        btnPrevEl.type = "button";
        btnPrevEl.textContent = "Prev";

        const btnNextEl = btnContainer.createEl("button");
        btnNextEl.type = "button";
        btnNextEl.textContent = "Next";
        



        btnNextEl.onclick = () => {
            if (this.rendition) {
                this.rendition.next();
            }
        }

        btnPrevEl.onclick = () => {
            if (this.rendition) {
                this.rendition.prev();
            }
        }

        this.epubContainer = this.container.createEl("div");
        this.epubContainer.style.height = "100%";
        this.epubContainer.style.width = "100%";

        this.container.style.overflow = "hidden";

        // this.eventHandlerMap = {
		// 	viewerLoaded(data: any) {
		// 		console.log("[epubjs]viewer ready");
		// 		self.viewerReady = true;
		// 	},
        // };
        // const self = this;
        // this.listener = function(event: any) {
        //     const data = event.data;
        //     if (!data["app"] || data["app"] !== "epubjs")return;
        //     // if (!data["app"] || data["app"] !== self.viewerId)return;
        //     const handler = self.eventHandlerMap[data.type];
        //     if (handler) handler(data.data);
            
        // }
        // window.addEventListener("message", this.listener);

    }

    private navigatePage(e: KeyboardEvent) {
        if (!this.rendition) return;
        console.log(e.key);
        if (e.key === "ArrowRight") {
            this.rendition.next();
            console.log("next");
        } else if (e.key === "ArrowLeft") {
            this.rendition.prev();
            console.log("prev");
        }
    }

    // private getViewerWindow() {
	// 	const self = this;
	// 	return new Promise<Window>((resolve,reject) => {
	// 		function wait() {
	// 			if(!self.viewerReady) {
	// 				setTimeout(wait,100);
	// 			} else {
	// 				resolve((self.container.children[0] as HTMLIFrameElement).contentWindow);
	// 			}
	// 		}
	// 		wait();
	// 	});
	// }

    // private postViewerWindowMessage(type: string, data?: any) {
	// 	return this.getViewerWindow().then(window => {
	// 		window.postMessage({
	// 			app: "obsidian-book",
	// 			type: type,
	// 			data: data,
	// 		},"*");

			
	// 	})
	// }

    async show(data: ArrayBuffer | string, state?: any, ext?: string, annotation?: string) {
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


        } else {
            this.data = data as ArrayBuffer;

            // this.container.createEl("iframe",{
            //     attr: {
            //         src: this.workerPath,
            //         width: "100%",
            //         height: "100%",
            //         frameborder:0
            //     },
                
            // });
            // return this.postViewerWindowMessage("openFile",{
            //     content: data,
            // });


            this.book = ePub(data, "binary");

            this.book.loaded.navigation.then(function(toc){
                console.log(toc);
            });

            this.rendition = this.book.renderTo(this.epubContainer,{
                width: "100%",
                height: "100%",
                manager: "continuous",
                // snap: true
                // flow: "scrolled",
                spread: "true",
            });

            // this.redition.on("book:pageChanged", (location: any) => {
            //     console.log(location);
            // });

            this.rendition.on("keydown",(e: KeyboardEvent) => {
                this.navigatePage(e);
            });

            this.rendition.on("selected", (cfiRange, contents) => {
                console.log("selected");
                this.rendition.annotations.highlight(cfiRange, {}, (e) => {
                    console.log("highlight clicked", e.target);
                });
                contents.window.getSelection().removeAllRanges();

            });
            

            this.rendition.themes.default({
            '::selection': {
                'background': 'rgba(255,255,0, 0.3)'
            },
            '.epubjs-hl' : {
                'fill': 'yellow', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply'
            }
            });
              

            // this.rendition.on("rendered", (section) => {
            //     var nextSection = section.next();
            //     var prevSection = section.prev();

            //     var nav = this. book.navigation.get(section.href);
            //     var nextNav = this. book.navigation.get(nextSection.href);
            //     var prevNav = this. book.navigation.get(prevSection.href);

            //     console.log("section:",nav.label);
            //     console.log("next section:",nextNav.label);
            //     console.log("prev section:",prevNav.label);
            // });


            // this.book.loaded.metadata.then(async (meta) => {
            //     if (this.book.archive) {
            //         // this.book.archive.createUrl(await this.book.coverUrl(),{base64: true});
            //       this.book.archive.createUrl(await this.book.coverUrl(),{base64: true})
            //         .then(function (url) {
            //             console.log("corver url:", url)
            //         })
            //     } else {
            //         console.log("corver url:", await this.book.coverUrl())

            //     }
          
            //   });
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

            return this.rendition.display();
        }


    }

    // async closeDocument() {
    //     if (this.redition) {
    //         this.redition.destroy();
    //         this.redition = null;
    //     }

    //     if (this.book) {
    //         this.book.destroy();
    //         this.book = null;
    //     }
    // }

    setState(state: EpubJSViewerState): void {

    }

    getState(): EpubJSViewerState {
        return this.state;
    }

    close(): void {
        this.data = null;
        // window.removeEventListener("message", this.listener);

    }
    
}