import { DocumentViewer } from "./documentViewer";


export class ImageViewer extends DocumentViewer {

    imgEl: HTMLImageElement;
    private zoomLevel: number = 1;
    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
    }


    private	async createImage(container: HTMLElement, src: string): Promise<HTMLImageElement> {

		return new Promise((resolve)=> {
			const img = container.createEl("img",{attr:{src:src}});
			img.onload = (e) => {
				const img = e.target as HTMLImageElement;
				resolve(img);
			};
		});
	}

    private imgWidth() {
		return this.imgEl?.naturalWidth;
	}
	private imgHeight() {
		return this.imgEl?.naturalHeight;
	}
	// private viewWidth() {
	// 	return this.imgEl?.width;
	// }
	// private viewHeight() {
	// 	return this.imgEl?.height;
	// }

    private zoom(zoom: number) {
        this.imgEl.width = this.imgWidth() * zoom;
		this.imgEl.height = this.imgHeight() * zoom;

		if (this.imgEl.width < this.container.offsetWidth) {
			this.imgEl.style.left = `${(this.container.offsetWidth - this.imgEl.offsetWidth)/2}px`;
		} else {
			this.imgEl.style.left = "0";
        }

        if (this.imgEl.height < this.container.offsetHeight) {
			this.imgEl.style.top = `${(this.container.offsetHeight - this.imgEl.offsetHeight)/2}px`;
		} else {
			this.imgEl.style.top = "0";
        }
    }

    private zoomAt(zoomLevel: number,e: MouseEvent) {

		const scrollX = this.container.scrollLeft;
		const scrollY = this.container.scrollTop;
		this.imgEl.width = this.imgWidth() * zoomLevel;
		this.imgEl.height = this.imgHeight() * zoomLevel;

		if (this.imgEl.width < this.container.offsetWidth) {
			this.imgEl.style.left = `${(this.container.offsetWidth - this.imgEl.offsetWidth)/2}px`;
		} else {
			this.imgEl.style.left = "0";

			const newX =  e.offsetX  * zoomLevel / this.zoomLevel;
			const pageX =  e.offsetX - scrollX;
			this.container.scrollLeft = newX - pageX; 

		}

		if (this.imgEl.height < this.container.offsetHeight) {
			this.imgEl.style.top = `${(this.container.offsetHeight - this.imgEl.offsetHeight)/2}px`;
		} else {
			this.imgEl.style.top = "0";

			const newY = e.offsetY * zoomLevel / this.zoomLevel;
			const pageY = e.offsetY - scrollY;
			this.container.scrollTop = newY - pageY;
		}



		this.zoomLevel = zoomLevel;
	}

    async show(url: string, state?: any, ext?: string){

        const maxWidth = this.container.offsetWidth;
		const maxHeight = this.container.offsetHeight; 

		this.createImage(this.container,url).then((img) => {
			this.imgEl = img;

			const scaleW = maxWidth/this.imgWidth();
			const scaleH = maxHeight/this.imgHeight();

			// const scale = Math.max(scaleW,scaleH);
			this.zoomLevel = Math.max(scaleW,scaleH);
			img.width = this.imgWidth() * this.zoomLevel;
			img.height = this.imgHeight() * this.zoomLevel;
			img.onwheel = (e) => {
				if (e.ctrlKey) {
					this.onZoom(e);
				}
			}

			// img.onclick = this.onClick.bind(this);


		})


    }

    private onZoom(e: WheelEvent) {

		var newZoom = this.zoomLevel;
		if (e.deltaY > 0) {
			newZoom /= 1.25;
		} else {
			newZoom *= 1.25;
		}

		if (newZoom > 0.1 && newZoom < 40) {
			this.zoomAt(newZoom,e);
		}

	
	}

    async closeDocument() {
    }

    getState() {
        throw new Error("Method not implemented.");
    }

}