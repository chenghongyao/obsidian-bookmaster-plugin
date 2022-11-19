import { normalizePath, TFile } from "obsidian";
import { reactive } from "vue";
import { Book, BookFolder } from "./Book";
import { BookVaultManager } from "./BookVault";
import BookMasterPlugin from "./main";
import * as utils from './utils'



export default class BookProjecetManager {
    plugin: BookMasterPlugin;
    bookVaultManager: BookVaultManagerl;
    projectBooks: BookFolder;
    projectFile: TFile;

    constructor(plugin: BookMasterPlugin) {
        this.plugin = plugin;
        this.bookVaultManager = plugin.bookVaultManager;
        this.projectBooks = reactive(new BookFolder(null, "", "","/"));
    }

    
    async loadProjectFile(file: TFile) {

        // TODO: project file is deleted
        this.projectFile = file;

        const projectName = utils.getPropertyValue(this.projectFile, "bm-name")  || this.projectFile.basename
        this.projectBooks.name = projectName;
        this.projectBooks.clear();
    
        
        let books = utils.getPropertyValue(this.projectFile, "bm-books");
        if (!books) return;

        if (typeof books === "string") books = [books];

        for (let i = 0; i < books.length; i++) {
            const regIdPath = /[a-zA-Z0-9]{16}/;
            const IdPathGroup = regIdPath.exec(books[i]);
            if (IdPathGroup) {
                const book = await this.bookVaultManager.getBookById(IdPathGroup[0]);
                if (book) {
                    this.projectBooks.push(book);
                }
                continue;
            } 

            const regUrl = /^\[(.*)\]\((https?:\/\/[\w\-_]+(?:\.[\w\-_]+)+[\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?\)$/
            const urlGroup = regUrl.exec(books[i]);
            if (urlGroup) {
                const book = new Book(null,null,urlGroup[2],urlGroup[1],"url",null);
                this.projectBooks.push(book);
                continue;
            }
            

        }

    }

    isProjectFile(file: TFile) {
		return file && (utils.getPropertyValue(file, "bookmaster-plugin") || utils.getPropertyValue(file,"bm-books"));
	}

    searchProjectFile(file: TFile) {
        if (this.isProjectFile(file)) {
			return file;
		}
		if (!file.parent.name) {
			return null;
		}
		const folderFilePath = normalizePath(file.parent.path + `/${file.parent.name}.md`);
		const folderFile = utils.app.vault.getAbstractFileByPath(folderFilePath) as TFile
		if (folderFile && this.isProjectFile(folderFile)) {
			return folderFile;
		} else {
			return null;
		}
    }
}