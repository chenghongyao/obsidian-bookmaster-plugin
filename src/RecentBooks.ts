import { TFile, normalizePath, debounce } from "obsidian";
import { reactive } from "vue";
import { Book, BookFolder } from "./Book";
import { BookVaultManager } from "./BookVault";
import BookMasterPlugin from "./main";
import * as utils from "./utils";


// TODO: remove books that are removed from book vault 

export default class RecentBooksManager {
    recentBooks: BookFolder
    plugin: BookMasterPlugin;
    bookVaultManager: BookVaultManager
    private debounceSaveRecentBooks: any;

    constructor(plugin: BookMasterPlugin) {
      this.plugin = plugin;
      this.bookVaultManager = this.plugin.bookVaultManager;

      this.recentBooks = reactive(new BookFolder(null, "", "recent", "/"));

      this.debounceSaveRecentBooks = debounce(() => {
        this.saveRecentBooks()
      },1000,true);

    }

    async setup() {
      this.recentBooks.children = []

      const content = await utils.safeReadObFile(this.plugin.settings.dataPath + "/recent.md");
      if (!content) return;

      const r = /\[.*\]\((.*)\)/g 
      var item = null;
      do {
        item = r.exec(content)?.[1];
        if (!item) continue;
        const url = new URL(item);
        if (!url) continue;
        const bid = url.searchParams.get("bid");
        if (!url) continue;
        this.bookVaultManager.getBookById(bid).then((book) => {
          this.recentBooks.push(book);
        })
      } while(item)
    }

    private async saveRecentBooks() {
      var content = "";
      for (var i = 0; i !== this.recentBooks.children.length;i++) {
        const book = this.recentBooks.children[i] as Book;
        content += `- [${book.meta.title||book.name}](obsidian://bookmaster?type=open-book&bid=${book.bid})\r\n`;
      }
      return utils.safeWriteObFile(normalizePath(this.plugin.settings.dataPath + "/recent.md"),content,true);
    }

    async addBook(book: Book) {
        const ind = this.recentBooks.children.indexOf(book);
        if (ind == 0) return;
        else if (ind > 0) {
          this.recentBooks.children.splice(ind,1);
        } else if (this.recentBooks.children.length >= this.plugin.settings.recentBookNumberLimit) {
          this.recentBooks.children.pop();
        }
        this.recentBooks.children.splice(0,0,book);
        return this.debounceSaveRecentBooks();
    }

    async removeBook(book: Book) {
      this.recentBooks.children.remove(book);
      return this.debounceSaveRecentBooks();
    }

    clear() {
      this.recentBooks.clear();
      return this.debounceSaveRecentBooks();
    }
}