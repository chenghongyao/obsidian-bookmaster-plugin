import { Book, BookFolder } from "src/Book";
import { reactive } from "vue";


export default class RecentBook {
    recentBook: BookFolder;
    constructor(recentBooks: Array<Book>) {
        this.recentBook = reactive(new BookFolder(null, "", "recent", ""));
    }
}