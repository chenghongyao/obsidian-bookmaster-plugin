import { ItemView, WorkspaceLeaf } from "obsidian";
import BookNotePlugin from "./main";
import Vue from 'vue';
import PDFViewer from "./view/PDFViewer.vue"


export const VIEW_TYPE_QUICK_BOOK_VIEW = "quick-book-view";
export class QuickBookView extends ItemView {
	plugin: BookNotePlugin;
	temp: string;

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf);
		this.plugin = plugin;
	}
	getDisplayText() {
		return "Quick Book View";
	}

	getViewType() {
		return VIEW_TYPE_QUICK_BOOK_VIEW;
	}

	async onOpen() {
		console.log("open quick book view");
		const container = this.contentEl.createDiv();

		console.log(this.temp);
		this.temp = "hello temp";
		// console.log(docData.length);
		const vueApp = new Vue({
			el: container,
			render: h => h("PDFViewer",{
				attrs: {
					plugin: this.plugin,
				},
				on: {

				},
				ref:"pdf",
			}),
			components: {
				PDFViewer,
			}
		});

		const pdfApp:any = vueApp.$refs.pdf;
		const docData = this.plugin.fs.readFileSync("D:\\paper\\50.pdf");
		pdfApp.loadDocument(docData);


	}

	async onClose() {
		console.log("close quick book view");
	}
}
