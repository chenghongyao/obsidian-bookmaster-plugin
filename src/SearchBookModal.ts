import { App, Modal } from "obsidian";
import BookNotePlugin from "./main";
import searchBook from "./view/search-book.vue";

import Vue from "vue"
export default class SearchBookModal extends Modal {
	plugin: BookNotePlugin;

	constructor(app: App, plugin: BookNotePlugin) {
		super(app);
		this.plugin = plugin;
	}


	walk(root: string, result: Array<any>) {
		const self = this;
		const files = this.plugin.fs.readdirSync(this.plugin.path.join(this.plugin.settings.bookPath, root));
		files.forEach((filename: string) => {
			const filepath = self.plugin.path.join(root, filename);
			const stat = self.plugin.fs.statSync(self.plugin.path.join(self.plugin.settings.bookPath, filepath));
			if (stat.isDirectory() && !filepath.startsWith(".")) {
				self.walk(filepath,result);
			} else {
				const ext = self.plugin.path.extname(filename).substr(1);
				if (self.plugin.isBookSupported(filename,ext)) { // window 下的临时文件
					const bookobj = {name:filename,path:filepath,ext:ext ? ext : "unknown"};
					result.push(bookobj);
				}
			}
		});
	}
	
	

	onOpen() {
		console.log("search model open");

		this.titleEl.setText("Search Book");
		const books = new Array<any>();
		this.walk("",books);
		this.contentEl.style.margin = "0.2em -1em"
		const container = this.contentEl.createDiv();
		const self = this;
		new Vue({
			el: container,
			render: h => h("search-book",{
				attrs: {
					books: books,
				},
				on: {
					"open-file": function(item: any) {
						self.plugin.openBookInBookView(item.path,true);
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