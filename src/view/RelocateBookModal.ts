import { App, Modal, Notice } from "obsidian";
import { Book, BookTreeSortType } from "../Book";
import BookMasterPlugin from "src/main";



export default class RelocateBookModal extends Modal {
    plugin: BookMasterPlugin;
    book: Book;

	constructor(plugin: BookMasterPlugin, book: Book) {
		super(plugin.app);
		this.plugin = plugin;
        this.book = book;
	}

    onOpen() {
    
		console.log("RelocateBookModal open");
        this.titleEl.setText(this.book.meta.title || this.book.name);
        this.modalEl.addClass("relocate-book-modal")


        const btn = this.modalEl.createEl("button",{cls:"mod-cta",type:"file"});
        btn.textContent = "手动重定位";
        btn.onclick =() => {

            const input = this.modalEl.createEl("input");
            input.type = "file";
            input.accept = "." + this.book.ext;
            input.style.display = "none";
            input.click();
            input.onchange = (e) => {
                const files = (e.target as any).files
                if (!files.length) return;

                const newAbsPath = files[0].path as string;
                const vaultPath = this.plugin.getBookVaultPath(this.book.vid);
                if (!newAbsPath.startsWith(vaultPath)) {
                    new Notice("选择的文件需要在对应书库内：\n"+vaultPath,0);
                    return;
                }
                const newPath = newAbsPath.substring(vaultPath.length).replace(/\\/g,"/")
                const entry = `${this.book.vid}:${newPath}`

                const newBook = this.plugin.bookMap[entry] as Book;
                if (!newBook) {
                    new Notice("没有找到对应文件，更新书库后重试");
                    console.error("cant find entry:",entry);
                    return;
                }

                if (newBook.bid) {
                    new Notice("当前文件已经存在存在信息，先手动删除？");
                    return;
                }

                this.book.path = newBook.path;
                this.book.name = newBook.name;
                this.book.lost = false;
                this.plugin.saveBookData(this.book);
                this.plugin.bookMap[entry] = this.book;
				newBook.parent.children.remove(newBook);
                this.plugin.updateDispTree();

                input.remove();
                new Notice("重定位成功");


            }
        };

    }

    onClose(): void {
    }
}