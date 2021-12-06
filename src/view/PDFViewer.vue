<template>
	<div>
		<!-- <canvas v-for="page in pages" :id="'canvas-page-'+page" :key="page"></canvas> -->
		<div>
			<button class="mod-cta" @click="onZoomOut">放大</button>
			<button class="mod-cta" @click="onZoomIn">缩小</button>
			<button class="mod-cta" @click="onClip">裁剪</button>
			<!-- <input type="text" v-model="clipRect"/> -->
		</div>
		<div style="text-align:center">
			<canvas id="id-pdf-canvas" ref="pdf-canvas"></canvas>
		</div>
		<div>
			<canvas ref="pdf-clip-canvas"></canvas>
		</div>
	</div>
</template>

<script>
import * as pdfjsLib from "pdfjs-dist/build/pdf.js";
import * as worker from "pdfjs-dist/build/pdf.worker.entry.js";
pdfjsLib.GlobalWorkerOptions.workerSrc = worker;


export default {
	data() {
		return {
			pdfDoc: null,
			numPages: 0,
			scale: 10,
			pageNumber: 1,
			pageCanvas: null,
			sc: true,
			dpi: 1.25,
		}
	},
	props: {
		app,
	},
	methods: {
		loadDocument(docData) {
			pdfjsLib.getDocument({ 
				data: docData,
			}).promise.then((pdfDoc => {
				this.pdfDoc = pdfDoc;
				this.numPages = pdfDoc.numPages;

				this.pageNumber = 1;

				console.log(pdfDoc.numPages);
				this.updatePage();
			}));
		},
		updatePage() {
			this.pdfDoc.getPage(this.pageNumber).then(page => {

					const viewport = page.getViewport({scale: this.scale*this.dpi});

					const canvas = this.$refs["pdf-canvas"];
					const context = canvas.getContext('2d');
					canvas.height = viewport.height || viewport.viewBox[3];
					canvas.width = viewport.width || viewport.viewBox[2];
					canvas.style.height = canvas.height/this.dpi + "px";
					canvas.style.width = canvas.width/this.dpi + "px";


					// console.log(viewport)
					// console.log(viewport.width,viewport.viewBox);
					console.log("canvas size:",canvas.height,canvas.width);

					const renderContext = {
						canvasContext: context,
						viewport: viewport
					};

					page.render(renderContext);

				});
		},
		onZoomOut() {
			this.scale = this.scale + 1;
			this.updatePage();
		},
		onZoomIn() {
			this.scale = this.scale - 1;
			this.updatePage();
		},

		
		onClip() {

			const canvas = this.$refs["pdf-canvas"];
			if (this.sc) {
				canvas.style.width = canvas.width + "px";
				canvas.style.height = canvas.height + "px";
			} else {
				canvas.style.width = canvas.width/this.dpi + "px";
				canvas.style.height = canvas.height/this.dpi + "px";
			}
			this.sc = !this.sc;
			console.log(canvas.style);
			console.log(canvas.style.width,"sdf",canvas.width);
			
		}
	},
}
</script>