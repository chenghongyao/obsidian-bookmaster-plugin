import { DocumentViewer } from "./documentViewer";


enum AnnotationType{
	Square = "square",
	FreeText = "freetext",
}


function getMouseOffset(ev: MouseEvent,ref: HTMLElement) {


	var cur = ev.target as HTMLElement;
	var offX = ev.offsetX;
	var offY = ev.offsetY;
	while(cur !== ref) {
		offX += cur.offsetLeft;
		offY += cur.offsetTop;
		cur = cur.parentElement;
	}

	return {offsetX: offX, offsetY: offY}
}

// TODO:multi click,text;


abstract class AnnotationBase {
	container: HTMLElement;
	annotContainer: HTMLElement;
	ctrlContainer: HTMLDivElement;
	contentContainer: HTMLDivElement;
	type: AnnotationType;

	startX: number;
	startY: number;

	moveMode: string;
	callbacks: any;

	constructor(type: AnnotationType, container: HTMLElement, ev: MouseEvent,callbacks?: any) {
		this.type = type;
		this.container = container;
		this.annotContainer = this.container.createDiv();
		this.annotContainer.style.position = "absolute";
		this.annotContainer.addClass("annot-item-container");
		this.annotContainer.addClass(type);
		this.annotContainer.addClass("drawing");


		this.ctrlContainer = this.annotContainer.createDiv();
		this.ctrlContainer.addClass("control-container");

		this.contentContainer = this.annotContainer.createDiv();
		this.contentContainer.addClass("content-container");


	



		this.moveMode = null;
		this.annotContainer.onmousedown = this.onMouseDown.bind(this);
		this.callbacks = callbacks;


		const {offsetX, offsetY} = getMouseOffset(ev,this.container);
		this.startX = offsetX;
		this.startY = offsetY;
	}	

	getWidth() {
		return this.container.offsetWidth;
	}
	getHeight() {
		return this.container.offsetHeight;
	}

	select() {
		this.annotContainer.addClass("selected");
	}
	deselect() {
		this.annotContainer.removeClass("selected");
	}
	isSelected() {
		this.annotContainer.hasClass("selected");
	}


	move(ev: MouseEvent) {

	}
	moveEnd(ev: MouseEvent) {

	}

	updateShape(startX: number, startY: number, endX: number, endY: number) {

		const left = Math.min(endX,startX);
		const top = Math.min(endY,startY);
		const width = Math.abs(endX - startX);
		const height = Math.abs(endY - startY);

		this.annotContainer.style.left = left*100/this.container.offsetWidth + "%"
		this.annotContainer.style.top = top*100/this.container.offsetHeight + "%"
		this.annotContainer.style.width = width*100/this.container.offsetWidth + "%"
		this.annotContainer.style.height = height*100/this.container.offsetHeight + "%"
	}


	protected onMouseDown(ev: MouseEvent) {
		ev.stopPropagation();
	}

	getType() {
		return this.type;
	}
	abstract draw(ev: MouseEvent): void;

	abstract drawEnd(): void;
}

class AnnotationSquareBase extends AnnotationBase {

	ctrlRB: HTMLDivElement;
	ctrlLB: HTMLDivElement;
	ctrlLT: HTMLDivElement;
	ctrlRT: HTMLDivElement;

	moveStartX: number;
	moveStartY: number;
	anchorStartX: number;
	anchorStartY: number;	
	anchorEndX: number;
	anchorEndY: number;

	constructor(type: AnnotationType, container: HTMLElement,ev: MouseEvent,callbacks?: any) {
		super(type, container,ev,callbacks);

		this.ctrlRB = this.ctrlContainer.createDiv();
		this.ctrlRB.addClass("control-point");
		this.ctrlRB.style.position = "absolute";
		this.ctrlRB.style.left = "100%";
		this.ctrlRB.style.top = "100%";
		this.ctrlRB.style.cursor = "nw-resize";

		this.ctrlLB = this.ctrlContainer.createDiv();
		this.ctrlLB.addClass("control-point");
		this.ctrlLB.style.position = "absolute";
		this.ctrlLB.style.right = "100%";
		this.ctrlLB.style.top = "100%";
		this.ctrlLB.style.cursor = "ne-resize";

		this.ctrlLT = this.ctrlContainer.createDiv();
		this.ctrlLT.addClass("control-point");
		this.ctrlLT.style.position = "absolute";
		this.ctrlLT.style.right = "100%";
		this.ctrlLT.style.bottom = "100%";
		this.ctrlLT.style.cursor = "nw-resize";

		this.ctrlRT = this.ctrlContainer.createDiv();
		this.ctrlRT.addClass("control-point");
		this.ctrlRT.style.position = "absolute";
		this.ctrlRT.style.left = "100%";
		this.ctrlRT.style.bottom = "100%";
		this.ctrlRT.style.cursor = "ne-resize";

		this.updateShape(this.startX,this.startY,this.startX,this.startY);
	}

	protected onMouseDown(ev: MouseEvent) {

		// console.log("annot:mousedown");

		const {offsetX, offsetY} = getMouseOffset(ev,this.container);
		this.moveStartX = offsetX;
		this.moveStartY = offsetY;
		this.anchorStartX = this.annotContainer.offsetLeft;
		this.anchorStartY = this.annotContainer.offsetTop;
		this.anchorEndX = this.annotContainer.offsetLeft + this.annotContainer.offsetWidth;
		this.anchorEndY = this.annotContainer.offsetTop + this.annotContainer.offsetHeight;


		if (ev.target === this.ctrlRB) {
			this.moveMode = "resize-rb";
		} else if (ev.target === this.ctrlLB) {
			this.moveMode = "resize-lb";
		} else if (ev.target === this.ctrlLT) {
			this.moveMode = "resize-lt";
		} else if (ev.target === this.ctrlRT) {
			this.moveMode = "resize-rt";
		} else if (this.ctrlContainer === ev.target) {
			this.moveMode = "move";
		}

		// else just click

		this.callbacks?.onMove(ev,this,this.moveMode);


		ev.stopPropagation();
	}	

	move(ev: MouseEvent): void {
		if (!this.moveMode) return;

		const {offsetX, offsetY} = getMouseOffset(ev,this.container);
		const dX = offsetX - this.moveStartX;
		const dY = offsetY - this.moveStartY;

		if (this.moveMode === "resize-rb") {
			const endX = this.anchorEndX + dX;
			const endY = this.anchorEndY + dY;
			this.updateShape(this.anchorStartX,this.anchorStartY,endX,endY);
		} else if (this.moveMode === "resize-lt") {
			const startX = this.anchorStartX + dX;
			const startY = this.anchorStartY + dY;
			this.updateShape(startX,startY,this.anchorEndX,this.anchorEndY);
		} else if (this.moveMode === "resize-rt") {
			const startY = this.anchorStartY + dY;
			const endX = this.anchorEndX + dX;
			this.updateShape(this.anchorStartX,startY,endX,this.anchorEndY);
		} else if (this.moveMode === "resize-lb") {
			const endY = this.anchorEndY + dY;
			const startX = this.anchorStartX + dX;
			this.updateShape(startX,this.anchorStartY,this.anchorEndX,endY);
		}
		else if (this.moveMode === "move") {

			const startX = this.anchorStartX + dX;
			const startY = this.anchorStartY + dY;
			const endX = this.anchorEndX + dX;
			const endY = this.anchorEndY + dY;

			this.updateShape(startX,startY,endX,endY);
		}
	}

	moveEnd(ev: MouseEvent): void {
		if (!this.moveMode) return;
		this.moveMode = null;
		// TODO: onModify;
	}
	


	draw(ev: MouseEvent) {
		const {offsetX, offsetY} = getMouseOffset(ev,this.container);
		this.updateShape(this.startX,this.startY,offsetX,offsetY);
	}

	drawEnd() {
		this.annotContainer.removeClass("drawing");
		// console.log("add annotation:",this.annotContainer);
	}
}


class AnnotationSquare extends AnnotationSquareBase {
	constructor(container: HTMLElement,ev: MouseEvent,callbacks?: any) {
		super(AnnotationType.Square, container,ev,callbacks);
	}
}




class AnnotationFreeText extends AnnotationSquareBase {
	constructor(container: HTMLElement,ev: MouseEvent,callbacks?: any) {
		super(AnnotationType.FreeText, container,ev,callbacks);

		this.contentContainer.spellcheck = false;
		this.contentContainer.contentEditable = "true";

		this.contentContainer.onkeydown = (ev: KeyboardEvent) => {
			if (ev.ctrlKey && ev.key == "enter") {
				console.log("finish");
			}
		};
	}

	drawEnd(): void {
		// this.contentContainer.textContent = "FreeText";
		this.contentContainer.focus();
		// this.contentContainer.click();
		// this.contentContainer.click();
		// const range = document.createRange();
		// range.selectNodeContents(this.contentContainer)
		// window.getSelection().addRange(range);

		this.annotContainer.removeClass("drawing");
	}
}

export class ImageViewer extends DocumentViewer {

	imgContainer: HTMLDivElement;
    imgEl: HTMLImageElement;
	annotLayer: HTMLDivElement;

	annotType: AnnotationType;
	currAnnot: AnnotationBase;

	moveMode: string;
	moveAnnot: AnnotationBase;


	annotations: Array<AnnotationBase> = [];
	selectedAnnotations: Array<AnnotationBase> = [];



    private zoomLevel: number = 1;
    constructor(bid:string, container: HTMLElement) {
        super(bid, container);
		this.annotType = null;
		// this.moveAnnotMode = false;
		this.moveAnnot = null;
		this.imgContainer = this.container.createDiv();
		this.imgContainer.addClass("image-container");
    }


	private enterAnnotMode(type: AnnotationType) {
		this.annotType = type;
		this.currAnnot = null;
		this.annotLayer.addClass("annot-mode");
	}

	private exitAnnotMode() {
		this.annotType = null;
		this.currAnnot = null;
		this.annotLayer.removeClass("annot-mode");
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

    private zoom(zoomLevel: number) {
        this.imgEl.width = this.imgWidth() * zoomLevel;
		this.imgEl.height = this.imgHeight() * zoomLevel;
		this.zoomLevel = zoomLevel;
		this.annotLayer.style.setProperty("--zoom-level",`${this.zoomLevel}`);


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

		this.annotLayer.style.left = this.imgEl.style.left;
		this.annotLayer.style.top = this.imgEl.style.top;
		this.annotLayer.style.width = this.imgEl.width + "px";
		this.annotLayer.style.height = this.imgEl.height + "px";
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


		this.annotLayer.style.left = this.imgEl.style.left;
		this.annotLayer.style.top = this.imgEl.style.top;
		this.annotLayer.style.width = this.imgEl.width + "px";
		this.annotLayer.style.height = this.imgEl.height + "px";

		this.zoomLevel = zoomLevel;
		this.annotLayer.style.setProperty("--zoom-level",`${this.zoomLevel}`);

	}

    async show(url: string, state?: any, ext?: string){

        // const maxWidth = this.imgContainer.offsetWidth;
		// const maxHeight = this.imgContainer.offsetHeight; 
		// FIXME: imgContainer.offsetWidt is 0 when viewer is open by workspace???

		this.createImage(this.imgContainer,url).then((img) => {
			this.imgEl = img;

			// const scaleW = maxWidth/this.imgWidth();
			// const scaleH = maxHeight/this.imgHeight();
			const scaleW = 0.5;
			const scaleH = 0.5;
			
			this.annotLayer = this.imgContainer.createDiv();
			this.annotLayer.style.position = "absolute";
			this.annotLayer.addClass("annotation-layer");
			this.annotLayer.addClass("normal-mode");


			this.enterAnnotMode(AnnotationType.FreeText);

			this.zoom(Math.max(scaleW,scaleH));

			this.annotLayer.onwheel = (e) => {
				if (e.ctrlKey) {
					this.onZoom(e);
				}
			}

			this.annotLayer.onmousedown = this.onMouseDown.bind(this);
			this.annotLayer.onmousemove = this.onMouseMove.bind(this);
			this.annotLayer.onmouseup = this.onMouseUp.bind(this);

		})
    }


	deselectAll() {
		for (var i = 0; i < this.selectedAnnotations.length; i++) {
			this.selectedAnnotations[i].deselect();
		}
		this.selectedAnnotations = [];
	}

	selectAnnotationOnly(annot: AnnotationBase) {
		this.deselectAll();
		this.selectAnnotation(annot);
	}
	selectAnnotation(annot: AnnotationBase) {
		annot.select();
		this.selectedAnnotations.push(annot);
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
		if (e.button === 0 ) {

			const callback = {
				onMove: (ev:MouseEvent, ins: AnnotationBase, moveMode: string) => {
					if (moveMode) {
						this.moveAnnot = ins;
						this.moveMode = moveMode;
						this.annotLayer.removeClass("normal-mode")
						this.annotLayer.addClass("modify-mode");
						this.annotLayer.addClass(moveMode);
					} else {
						// just click
					}
					this.selectAnnotationOnly(ins);
				}	
			}

			if (this.annotType === AnnotationType.Square) {
				this.currAnnot = new AnnotationSquare(this.annotLayer,e,callback);
			} else if (this.annotType == AnnotationType.FreeText) {
				this.currAnnot = new AnnotationFreeText(this.annotLayer,e,callback);
			}
			this.annotLayer.removeClass("normal-mode")
			this.annotLayer.addClass("draw-mode");
		}

		this.deselectAll();
	}

	private onMouseUp(e: MouseEvent) {
		if (e.button === 0) {
			if (this.annotType && this.currAnnot) {
					this.currAnnot.drawEnd(); // FIXME: not quite end

					this.deselectAll();
					this.annotations.push(this.currAnnot);
					this.selectAnnotation(this.currAnnot);
					this.currAnnot = null;
					this.annotLayer.removeClass("draw-mode");
					this.annotLayer.addClass("normal-mode");


			} else if(this.moveAnnot) {
				// this.moveAnnotMode = false;
				this.moveAnnot.moveEnd(e);
				this.annotLayer.removeClass(this.moveMode);
				this.annotLayer.removeClass("modify-mode");
				this.annotLayer.addClass("normal-mode");
				this.moveAnnot = null;
				this.moveMode = null;
			}
		} 
	}

	private onMouseMove(e: MouseEvent) {
		if (this.annotType && this.currAnnot) {
			this.currAnnot.draw(e);
		} else if (this.moveAnnot) {
			this.moveAnnot.move(e);
		}

		
		// const el = e.target as HTMLElement;
		// console.log(el.className);

	}

    async closeDocument() {
    }

    getState() {
    }
	setState(state?: any): void {
	}

}