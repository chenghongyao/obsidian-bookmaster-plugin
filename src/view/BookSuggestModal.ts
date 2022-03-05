import { App, Menu, SuggestModal } from "obsidian";
import BookMasterPlugin from "../main";
import { Book } from "../Book";



export default class BookSuggestModal extends SuggestModal<Book> {
	books: Book[]
	query: string;
	plugin: BookMasterPlugin;
	constructor(app: App,plugin: BookMasterPlugin, books: Book[]) {
		super(app);
		this.plugin = plugin;
		this.books = books;
		this.query = "";
		this.setPlaceholder("输入标题或文件名......");
	}


	getSuggestions(query: string): Book[] {
		this.query = query;
		const res: Book[] = [];
		this.books.forEach((book) => {
			const text = book.meta.title || book.name || book.path;
			if (text.indexOf(query) >= 0) {
				res.push(book);
			}

		})
		return res;
	}

	renderSuggestion(book: Book, el: HTMLElement) {
		const title = book.meta.title || book.name || book.path;
        
        if (this.query) {
            el.innerHTML = title.replace(RegExp(`(${this.query})`,'g'),'<span class="suggestion-highlight">$1</span>');
            //+ `<div class=suggestion-note>${book.path.replace(RegExp(`(${this.query})`,'g'),'<span class="suggestion-highlight">$1</span>')}</div>`;
            el.createDiv({text:book.path,cls:"suggestion-note"});
        } else {
            el.createSpan({text: title});
            el.createDiv({text:book.path,cls:"suggestion-note"});
        }
        
	}

	onChooseSuggestion(item: Book, evt: MouseEvent | KeyboardEvent) {
		if (evt instanceof MouseEvent && evt.button === 2) {
			const menu = new Menu(this.app);
			this.plugin.createBookContextMenu(menu,item);
			menu.showAtMouseEvent(evt);
		} else {
			this.plugin.openBook(item,evt.ctrlKey);
		}
	}
}

