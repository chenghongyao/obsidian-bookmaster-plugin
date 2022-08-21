import { App, Menu, SuggestModal } from "obsidian";
import BookMasterPlugin from "../main";
import { Book, BookFolder } from "../Book";
import * as utils from "../utils"



export default class BookSuggestModal extends SuggestModal<Book> {
	books: Book[]
	query: string;
	plugin: BookMasterPlugin;
	constructor(app: App,plugin: BookMasterPlugin, folder: BookFolder, limit: number = 20) {
		super(app);
		this.plugin = plugin;
		this.books = []
		if (folder) {
			utils.walkBookFolder(folder,(book) =>this.books.push(book as Book),false);
		}
		this.query = "";
		this.limit = limit;
		this.setPlaceholder("输入标题或文件名......");
	}


	getSuggestions(query: string): Book[] {
		// TODO: search tags or something
		// const ftag = ":tags "
		// const checktag = false;
		// if (query.startsWith(ftag)) {
		// 	this.query = query.substring(ftag.length)
		// } else {
		// 	this.query = query;
		// }

		this.query = query;
		if (!this.query) {
			return this.books;
		}

		const res: Book[] = [];
		this.books.forEach((book) => {
			if ( (book.meta.title && book.meta.title.indexOf(query) >= 0) || book.name.indexOf(query) >= 0) {
				res.push(book);
			}

		})
		return res;
	}

	renderSuggestion(book: Book, el: HTMLElement) {
		const title = book.meta.title || book.name;
        
        if (this.query) {

            el.innerHTML = title.replace(RegExp(`(${this.query})`,'g'),`<span class="suggestion-highlight">$1</span>`);
            //+ `<div class=suggestion-note>${book.path.replace(RegExp(`(${this.query})`,'g'),'<span class="suggestion-highlight">$1</span>')}</div>`;
            el.createDiv({text:book.path,cls:"suggestion-note"});
        } else {
			// el.createSpan({cls: "suggestion-flair bm-book-tag",text: book.ext});
            el.createSpan({text: title});
            el.createDiv({text:book.path,cls:"suggestion-note"});
        }
        
	}

	onChooseSuggestion(item: Book, evt: MouseEvent | KeyboardEvent) {
		if (evt instanceof MouseEvent && evt.button === 2) {
			const menu = new Menu();
			this.plugin.createBookContextMenu(menu,item);
			menu.showAtMouseEvent(evt);
		} else {
			this.plugin.openBook(item,evt.ctrlKey);
		}
	}
}

