import { App, Modal } from "obsidian";
import BookNotePlugin from "./main";
import searchBook from "./view/search-book.vue";

import Vue from "vue"
import { AbstractBook } from "./types";
export default class SearchBookModal extends Modal {
	plugin: BookNotePlugin;

	constructor(app: App, plugin: BookNotePlugin) {
		super(app);
		this.plugin = plugin;
	}
	onOpen() {
		console.log("search model open");

		this.titleEl.setText("Search Book");

		if (this.plugin.bookRawTree.length === 0) {
			this.plugin.updateBookDispTree();
		}
		this.contentEl.style.margin = "0.2em -1em"
		const container = this.contentEl.createDiv();
		const self = this;
		new Vue({
			el: container,
			render: h => h("search-book",{
				attrs: {
					books: this.plugin.bookRawTree,
				},
				on: {
					"open-file": function(book: AbstractBook) {
						self.plugin.openBookInBookView(book,true);
						self.close();
					}
				}
			}),
			components: {
				searchBook,
			}
		})
	}

	onClose() {
		console.log("search model close");
	}
}