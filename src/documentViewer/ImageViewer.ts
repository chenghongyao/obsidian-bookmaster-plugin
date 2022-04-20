import { DocumentViewer } from "./documentViewer";


enum AnnotationType{
	Square = "square",
}


// TODO:multi click,text;
abstract class AnnotationBase {
	container: HTMLElement;
	annotEl: HTMLElement;

	startX: number;
	startY: number;

	constructor(container: HTMLElement, ev: MouseEvent) {
		this.container = container;

		const {offsetX, offsetY} = this.getMousePosition(ev);

		this.startX = offsetX;
		this.startY = offsetY;
	}	

	protected getMousePosition(e: MouseEvent) {
		var offX = 0;
		var offY = 0;
		if (e.target !== this.container) {
			const tar = e.target as HTMLElement;
			offX = tar.offsetLeft + e.offsetX;
			offY = tar.offsetTop + e.offsetY;
		} else {
			offX = e.offsetX;
			offY = e.offsetY;
		}

		return {offsetX: offX, offsetY: offY}
	}


	abstract getType(): AnnotationType;

	abstract update(ev: MouseEvent): void;

	abstract end(): void;
}

class AnnotationSquare extends AnnotationBase {
	constructor(container: HTMLElement,ev: MouseEvent) {
		super(container,ev);

		this.annotEl = this.container.createDiv();
		this.annotEl.style.border = "2px solid red";
		this.annotEl.style.width = "0";
		this.annotEl.style.height = "0";
		this.annotEl.style.position = "absolute";

		this.annotEl.style.left = this.startX*100/this.container.offsetWidth + "%"
		this.annotEl.style.top = this.startY*100/this.container.offsetHeight + "%"
	}


	getType(): AnnotationType {
		return AnnotationType.Square;
	}


	update(ev: MouseEvent) {
		const {offsetX, offsetY} = this.getMousePosition(ev);

		const left = Math.min(offsetX,this.startX);
		const top = Math.min(offsetY,this.startY);
		const width = Math.abs(offsetX - this.startX);
		const height = Math.abs(offsetY - this.startY);

		this.annotEl.style.left = left*100/this.container.offsetWidth + "%"
		this.annotEl.style.top = top*100/this.container.offsetHeight + "%"
		this.annotEl.style.width = width*100/this.container.offsetWidth + "%"
		this.annotEl.style.height = height*100/this.container.offsetHeight + "%"
	}

	end() {
		console.log("add annotation:",this.annotEl);
	}
}

export class ImageViewer extends DocumentViewer {

	imgContainer: HTMLDivElement;
    imgEl: HTMLImageElement;
	annotContainer: HTMLDivElement;

	annotType: AnnotationType;
	annotIns: AnnotationBase;

    private zoomLevel: number = 1;
    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
		this.annotType = null;
		this.imgContainer = this.container.createDiv();
		this.imgContainer.addClass("image-container");
    }


	private enterAnnotMode(type: AnnotationType) {
		this.annotType = type;
		this.annotIns = null;
		this.annotContainer.addClass("annot-mode");
	}

	private exitAnnotMode() {
		this.annotType = null;
		this.annotIns = null;
		this.annotContainer.removeClass("annot-mode");
	}

    private	async createImage(container: HTMLElement, src: string): Promise<HTMLImageElement> {

		return new Promise((resolve)=> {
			const img = container.createEl("img",{attr:{src:src}});
			img.addClass("main-image");
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

    private zoom(zoomLevel: number) {
        this.imgEl.width = this.imgWidth() * zoomLevel;
		this.imgEl.height = this.imgHeight() * zoomLevel;
		this.zoomLevel = zoomLevel;

		if (this.imgEl.width < this.imgContainer.offsetWidth) {
			this.imgEl.style.left = `${(this.imgContainer.offsetWidth - this.imgEl.offsetWidth)/2}px`;
		} else {
			this.imgEl.style.left = "0";
        }

        if (this.imgEl.height < this.imgContainer.offsetHeight) {
			this.imgEl.style.top = `${(this.imgContainer.offsetHeight - this.imgEl.offsetHeight)/2}px`;
		} else {
			this.imgEl.style.top = "0";
        }

		this.annotContainer.style.left = this.imgEl.style.left;
		this.annotContainer.style.top = this.imgEl.style.top;
		this.annotContainer.style.width = this.imgEl.width + "px";
		this.annotContainer.style.height = this.imgEl.height + "px";
    }

    private zoomAt(zoomLevel: number,e: MouseEvent) {

		const scrollX = this.imgContainer.scrollLeft;
		const scrollY = this.imgContainer.scrollTop;
		this.imgEl.width = this.imgWidth() * zoomLevel;
		this.imgEl.height = this.imgHeight() * zoomLevel;

		if (this.imgEl.width < this.imgContainer.offsetWidth) {
			this.imgEl.style.left = `${(this.imgContainer.offsetWidth - this.imgEl.offsetWidth)/2}px`;
		} else {
			this.imgEl.style.left = "0";

			const newX =  e.offsetX  * zoomLevel / this.zoomLevel;
			const pageX =  e.offsetX - scrollX;
			this.imgContainer.scrollLeft = newX - pageX; 

		}

		if (this.imgEl.height < this.imgContainer.offsetHeight) {
			this.imgEl.style.top = `${(this.imgContainer.offsetHeight - this.imgEl.offsetHeight)/2}px`;
		} else {
			this.imgEl.style.top = "0";

			const newY = e.offsetY * zoomLevel / this.zoomLevel;
			const pageY = e.offsetY - scrollY;
			this.imgContainer.scrollTop = newY - pageY;
		}


		this.annotContainer.style.left = this.imgEl.style.left;
		this.annotContainer.style.top = this.imgEl.style.top;
		this.annotContainer.style.width = this.imgEl.width + "px";
		this.annotContainer.style.height = this.imgEl.height + "px";

		this.zoomLevel = zoomLevel;
	}

    async show(url: string, state?: any, ext?: string){

        const maxWidth = this.imgContainer.offsetWidth;
		const maxHeight = this.imgContainer.offsetHeight; 

		this.createImage(this.imgContainer,url).then((img) => {
			this.imgEl = img;

			const scaleW = maxWidth/this.imgWidth();
			const scaleH = maxHeight/this.imgHeight();

			
			this.annotContainer = this.imgContainer.createDiv();
			this.annotContainer.style.position = "absolute";
			this.annotContainer.addClass("annotation-layer");

			this.enterAnnotMode(AnnotationType.Square);

			this.zoom(Math.max(scaleW,scaleH));

			this.annotContainer.onwheel = (e) => {
				if (e.ctrlKey) {
					this.onZoom(e);
				}
			}

			this.annotContainer.onmousedown = this.onMouseDown.bind(this);
			this.annotContainer.onmousemove = this.onMouseMove.bind(this);
			this.annotContainer.onmouseup = this.onMouseUp.bind(this);

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

	private onMouseDown(e: MouseEvent) {
		if (e.button === 0 &&　this.annotType) {
			if (this.annotType === "square")
			this.annotIns = new AnnotationSquare(this.annotContainer,e);
		}
	}

	private onMouseUp(e: MouseEvent) {
		if (e.button === 0 && this.annotType && this.annotIns) {
			this.annotIns.end();
			this.annotIns = null;
		}
	}

	private onMouseMove(e: MouseEvent) {
		if (this.annotType && this.annotIns) {
			this.annotIns.update(e);
		}
	}

    async closeDocument() {
    }

    getState() {
        throw new Error("Method not implemented.");
    }

}