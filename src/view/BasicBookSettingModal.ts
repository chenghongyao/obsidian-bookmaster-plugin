import { App, Modal } from "obsidian";
import { Book, BookTreeSortType } from "../Book";
import BookMasterPlugin from "src/main";
import vQuickSetting from "../components/v-basic-setting.vue"
import { createApp } from "vue";



export default class BasicBookSettingModal extends Modal {
    plugin: BookMasterPlugin;
    book: Book;
    modified: boolean;
    updateTree: boolean;
    viewRect? :any

	constructor(app: App, plugin: BookMasterPlugin, book: Book, viewRect?: any) {
		super(app);
		this.plugin = plugin;
        this.book = book;
        this.modified = false;
        this.updateTree = false;
        this.viewRect = viewRect;

	}

    onOpen() {
    
		// console.log("QuickSettingModal open");
        this.titleEl.setText(this.book.meta.title || this.book.name);
        this.titleEl.addClass("basic-book-setting-title");
        this.modalEl.addClass("basic-book-setting-modal")

        if (this.viewRect) {
            // TODO: more elegant
            this.modalEl.style.position = "absolute";
            this.modalEl.style.top = this.viewRect.top + "px";
            this.modalEl.style.left = this.viewRect.right - this.modalEl.clientWidth + "px";
        }

        const self = this;
        const el = this.contentEl.createDiv();
        const vm = createApp(vQuickSetting, {
            book: this.book,
            onChange: function (key?: string) {
                self.modified = true;
                self.updateTree = (key === "tags" && self.plugin.settings.bookTreeSortType === BookTreeSortType.TAG) 
                                    ||  (key === "authors" && self.plugin.settings.bookTreeSortType === BookTreeSortType.AUTHOR)
            },
            onOpenNote: function() {
                // self.plugin.createBookNote(self.book);
            }
        }).mount(el);
    }

    onClose(): void {
        if (this.modified) {
            this.plugin.bookVaultManager.saveBookDataSafely(this.book).then(() => {
                if (this.updateTree) {
                    this.plugin.bookVaultManager.updateBookDispTree();
                }                    
            });
        }
    }
}