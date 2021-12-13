
import * as pdfjsLib from "pdfjs-dist/build/pdf.js";
import * as worker from "pdfjs-dist/build/pdf.worker.entry.js";
import BookNotePlugin from "./main";
pdfjsLib.GlobalWorkerOptions.workerSrc = worker;


export async function clipPDF(plugin: BookNotePlugin, zoomLevel: number, pdfDoc: any,pageNum: Number, clipBox: any,imgPath: string) {

	// const dpi = window.devicePixelRatio ? window.devicePixelRatio : 1
	const clipWidth = (clipBox[2] - clipBox[0])*zoomLevel;
	const clipHeight = (clipBox[3] - clipBox[1])*zoomLevel;
	const clipLeft = clipBox[0]*zoomLevel;

	await pdfDoc.getPage(pageNum).then((page: any) => {
		const clipTop = (page.view[3] - clipBox[3])*zoomLevel;

		const viewport = page.getViewport({
			scale: zoomLevel,
			offsetX:-clipLeft,
			offsetY:-clipTop,
		});

		const canvas = document.createElement("canvas");
		const context = canvas.getContext('2d');
		canvas.height = clipHeight;
		canvas.width = clipWidth;

		const renderContext = {
			canvasContext: context,
			viewport: viewport
		};

		page.render(renderContext).promise.then(() => {
			// TODO: more efficient??
			// TODO: image is blur??
			canvas.toBlob((blob) => {
				blob.arrayBuffer().then(buf => {
					plugin.safeWriteFile(imgPath,Buffer.from(buf), false);

				})
			},"image/png",1);

		});
		
	});


	return {clipWidth,clipHeight};
}

export async function getPDFDocFromData(docData: Buffer,cmap?:string) {
	return await pdfjsLib.getDocument({ 
		data: docData,
		cMapUrl: cmap,
		cMapPacked: true
	}).promise;
}

export function getPDFPageNumber(pdfDoc:any) {
	return pdfDoc.numPages;
}