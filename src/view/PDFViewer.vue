<template>
	<div >
		<!-- <canvas v-for="page in pages" :id="'canvas-page-'+page" :key="page"></canvas> -->
		<div>
			<button class="mod-cta" @click="onZoomOut">放大</button>
			<button class="mod-cta" @click="onZoomIn">缩小</button>
			<button class="mod-cta" @click="onClip">裁剪</button>
			<!-- <input type="text" v-model="clipRect"/> -->
		</div>

		<div v-for="page in numPages" style="text-align:center;width:100%" :key="page" :id="`pdf-page-container-${page}`" :ref="`pdf-page-container-${page}`">
			<canvas :id="`pdf-canvas-${page}`" :ref="`pdf-canvas-${page}`" ></canvas>
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
			scale: 2,
			pageNumber: 1,
			pageCanvas: null,
			sc: true,
			dpi: 3,
		}
	},
	props: {
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
				this.updatePage(1);
				this.updatePage(2);
				this.updatePage(3);
			}));
		},

		updatePage(pageNum) {
			this.pdfDoc.getPage(pageNum).then(page => {
					
					const canvas = this.$refs["pdf-canvas-"+pageNum][0];

					const container = this.$refs["pdf-page-container-"+pageNum][0];
					const width = container.clientWidth||o.offsetWidth;

					const viewport = page.getViewport({scale: 1});
					const vpWidth = viewport.width || viewport.viewBox[2];
					console.log(width,vpWidth);

					const scale = width/vpWidth;
					console.log(scale);

					const newViewPort = page.getViewport({scale: scale*this.dpi});

					const context = canvas.getContext('2d');
					canvas.height = newViewPort.height || newViewPort.viewBox[3];
					canvas.width = newViewPort.width || newViewPort.viewBox[2];
					canvas.style.height = canvas.height/this.dpi + "px";
					canvas.style.width = canvas.width/this.dpi + "px";

					console.log(canvas.width,canvas.height);
					console.log(canvas.style.width,canvas.style.height);

					const renderContext = {
						canvasContext: context,
						viewport: newViewPort
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