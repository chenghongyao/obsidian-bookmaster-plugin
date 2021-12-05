
import * as pdfjsLib from "pdfjs-dist/build/pdf.js";
import * as worker from "pdfjs-dist/build/pdf.worker.entry.js";
import BookNotePlugin from "./main";
pdfjsLib.GlobalWorkerOptions.workerSrc = worker;


export async function clipPDF(plugin: BookNotePlugin, pdfDoc: any,pageNum: Number, clipBox: any,imgPath: string) {

	const dpi = window.devicePixelRatio ? window.devicePixelRatio : 1
	const zoomLevel = 3*dpi;
	const clipWidth = (clipBox[2] - clipBox[0])*zoomLevel;
	const clipHeight = (clipBox[3] - clipBox[1])*zoomLevel;
	const clipLeft = clipBox[0]*zoomLevel;

	const scaleWidth = clipWidth/dpi;
	const scaleHeight = clipHeight/dpi;

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

		canvas.style.height = scaleHeight + "px";
		canvas.style.width = scaleWidth + "px";

		const renderContext = {
			canvasContext: context,
			viewport: viewport
		};

		page.render(renderContext).promise.then(() => {
			// TODO: more efficient??
			// TODO: image is blur??
			canvas.toBlob((blob) => {
				blob.arrayBuffer().then(buf => {
					plugin.safeWriteFile(imgPath,Buffer.from(buf), true);

				})
			},"image/png",1);

		});
		
	});


	return {clipWidth,clipHeight};
}

export async function getPDFDocFromData(docData: Buffer) {
	return await pdfjsLib.getDocument({ 
		data: docData,
		cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@2.10.377/cmaps/",
		cMapPacked: true
	}).promise;
}

export function getPDFPageNumber(pdfDoc:any) {
	return pdfDoc.numPages;
}