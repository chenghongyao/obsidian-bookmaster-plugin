import { App, Modal } from "obsidian";
import { Book } from "src/Book";
import BookMasterPlugin from "src/main";
import vQuickSetting from "../components/v-basic-setting.vue"

import Vue from "vue";


export default class BasicBookSettingModal extends Modal {
    plugin: BookMasterPlugin;
    book: Book;
    modified: boolean;
    viewRect? :any

	constructor(app: App, plugin: BookMasterPlugin, book: Book, viewRect?: any) {
		super(app);
		this.plugin = plugin;
        this.book = book;
        this.modified = false;
        this.viewRect = viewRect;

	}

    onOpen() {
    
		console.log("QuickSettingModal open");
        this.titleEl.setText(this.book.meta.title || this.book.name);
        this.titleEl.addClass("book-setting-title");
        this.modalEl.addClass("basic-book-setting-modal")

        if (this.viewRect) {
            // TODO: more elegant
            this.modalEl.style.position = "absolute";
            this.modalEl.style.top = this.viewRect.top + "px";
            this.modalEl.style.left = this.viewRect.right - this.modalEl.clientWidth + "px";
        }

        const self = this;
        const el = this.contentEl.createDiv();
        const vueApp = new Vue({
            el: el,
            render: h => h('v-quick-setting', {
                attrs: {
                    book: this.book
                },
                on: {
                    change: function () {
                        self.modified = true;
                    },
                    "open-note": function() {
                        // self.plugin.createBookNote(self.book);
                    }
                },
            }),
            components: {
                vQuickSetting,
            }
        });

    }

    onClose(): void {
        if (this.modified) {
            this.plugin.saveBookData(this.book);
        }
    }
}