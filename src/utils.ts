import { App, Platform, TFile, TFolder } from "obsidian";
import { AbstractBook, Book, BookFolder } from "./Book";

export const app: App = (window as any).app as App;
export const appId: string = (app as any).appId as string;
export const fs: any = (app.vault.adapter as any).fs;

// create 16bit bid;
export function generateBid() {
    function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    }  
    return S4()+S4()+S4()+S4();
}

export async function isFolder(path:string) {
    if (Platform.isMobile) {
        return (await fs.stat(path)).type === "directory";
    } else {
        return fs.statSync(path).isDirectory();
    }
}
export async function isFolderExists(path: string) {
    if (Platform.isMobile) {
        return await fs.exists(path) && (await fs.stat(path)).type === "directory";
    } else {
        return fs.existsSync(path) && fs.statSync(path).isDirectory();
    }
}

export async function isFileExists(path: string) {
    if (Platform.isMobile) {
        return await fs.exists(path) && !((await fs.stat(path)).type === "directory");
    } else {
        return fs.existsSync(path) && !fs.statSync(path).isDirectory();
    }
}


export async function readFile(path: string) {
    if (Platform.isMobile) {
        return fs.readBinary(path);
    } else {
        return new Promise((resolve,reject) => {
            fs.readFile(path,(err: any, data: any) => {
                if (err) {
                    // new Notice("无法读取文件:"+fullPath);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    
    }
}

export function getExtName(path: string) {
    if (path.lastIndexOf(".") === -1) return "";
    return path.substring(path.lastIndexOf(".")+1)
}

export function  getDirName(dirpath: string) {
    // TODO: more robust
    const g = /(.*)\/(?:.*)/.exec(dirpath);
    if (g && g[1] === "")return "/";
    else return g?.[1];
}

export function  getDirPath(filepath: string) {
    // TODO: more robust
    const g = /(.*)\/(?:.*)/.exec(filepath);
    if (g && g[1] === "")return "/";
    else return g?.[1];
}

export function isValidBook(bookname: string,ext: string,validBookExts: Array<string>) {
    return !bookname.startsWith("~$") && !bookname.startsWith(".") && validBookExts.indexOf(ext) >= 0;
}
export function normalizePath(root: string,rpath:string) {
    // TODO: more robust
    return root + (rpath.startsWith("/") ? rpath :"/" + rpath);
    // return (app.vault.adapter as any).path.join(root,rpath);
}

export async function safeWriteFile(path: string, data: Buffer|string, overwrite: boolean = false) {
    const vault = app.vault;
    const file = vault.getAbstractFileByPath(path) as TFile;
    if (file) {
        if (!overwrite)return;
        if (typeof data === "string") {
            return vault.modify(file,data as string);
        } else {
            return vault.modifyBinary(file, data as Buffer);
        }
    } else {
        const folderPath = getDirPath(path);
        if (folderPath !== ".") {
            const folder = vault.getAbstractFileByPath(folderPath) as TFolder;
            if (!folder) {
                await vault.createFolder(folderPath);
            }
        }
        
        if (typeof path === "string") {
            return vault.create(path, data as string).then(() =>{
                return;
            })
        } else {
            return vault.createBinary(path, data as Buffer).then(() => {
                return;
            })
        }

        
    }

}



export function cleanFolderInMap(folder: BookFolder,map: {[path:string]:AbstractBook}) {
		
    for (var i = 0; i < folder.children.length; i++) {  // if test flag is still false, then it is deleted
        const abs = folder.children[i];
        const entry = `${abs.vid}:${abs.path}`;
        delete map[entry];

        if (abs.isFolder()) {
            this.cleanFolderInMap(abs as BookFolder,map);
        } 
    }

    folder.children.splice(0,folder.children.length);
}


export function walkTreeByFolder(tree: BookFolder, result: BookFolder) {
    tree.children.forEach((book) => {
        if (book.isFolder()) {
            const folder = new BookFolder(result,book.vid,book.name,book.path,book.lost); // FIXME: book.lost??
            result.push(folder);
            walkTreeByFolder(book as BookFolder,folder);
        } else {
            result.push(book);
        }
    });
}

function getBookFolder(vid:string, path: string, rootFolder: BookFolder, map: Map<string,BookFolder>) {
		
    const nodes = path.split("/"); // path start with '/'
    var folder = rootFolder;
    var p = "";

    for(let i = 0; i < nodes.length; i++) {
        p += nodes[i];
        var f = map.get(p);
        if (!f || !f.isFolder()) {
            f = new BookFolder(folder,vid,nodes[i],p);
            folder.push(f);
            map.set(p,f);
        }
        folder = f as BookFolder;
        p += "/";
    }
    return folder;
}

export function walkBookFolder(folder: BookFolder, callback: (book: AbstractBook)=>any, callOnFolder: boolean = false) {
    folder.children.forEach((item) => {
        if (item.isFolder()) {
            walkBookFolder(item as BookFolder,callback);
            if (callOnFolder) {
                callback(item);
            }
        } else {
            callback(item);
        }
    })
}

export function walkTreeByTag(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {

    walkBookFolder(tree,(book: Book) => {
        const tags = new Set(book.meta.tags.map((t:string) => t.trim()));
        if (tags.size) {
            tags.forEach((tag:string) => {
                if (!tag) return;
                const folder = map.get(tag) || getBookFolder(book.vid,tag,result,map);
                folder.push(book);
            });
        } else {
            map.get("unknown").push(book);
        }
    });
}

export function walkTreeByAuthor(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {

    walkBookFolder(tree,(book: Book) => {
        const authors = new Set(book.meta.authors.map((t:string) => t.trim()));
        if (authors.size) {
            authors.forEach((author:string) => {
                if (!author)return; 
                let folder = map.get(author);
                if (!folder) {
                    folder = new BookFolder(result, book.vid,author,author);
                    map.set(author,folder);
                    result.push(folder);
                }
                folder.push(book);
            });
        } else {
            map.get("unknown").push(book);
        }
    });
}

export function walkTreeByPublishYear(map: Map<string,BookFolder>, tree: BookFolder, result: BookFolder) {  

    walkBookFolder(tree,(book: Book) => {
        const date = String(book.meta.publish_date);
        if (date && /^\d{4}/.test(date)) {
            const year =  date.substring(0,4);
            let folder = map.get(year) as BookFolder;
            if (!folder) {
                folder = new BookFolder(result,book.vid,year,year);
                map.set(year,folder);
                result.push(folder);
            }
            folder.push(book);
        }  else {
            map.get("unknown").push(book);
        }          


    });
}


export function accumulateTreeCount(tree: BookFolder) {
    var count = 0;
    for(var i = 0; i < tree.children.length; i++) {
        const book = tree.children[i];
        if (book.isFolder()) {
            count += accumulateTreeCount(book as BookFolder);
        } else {
            count += 1;
        }
    }
    tree.count = count;
    return count;
}


export function sortBookTree(tree: BookFolder,asc: boolean,) {

    tree.children.sort((a:AbstractBook,b:AbstractBook)=> {
        if (a.isFolder() !== b.isFolder()) {
            if (a.isFolder()) return -1;
            else return 1;
        } else if (a.isFolder() && b.isFolder()) {
            if (a.name === "unknown") {
                return 1;
            } else if (b.name === "unknown") {
                return -1;
            }
            if (asc) {
                return a.name > b.name  ? 1 : -1;
            } else {
                return a.name < b.name  ? 1 : -1;
            }
        } else {
            // sort by title first!
            // TODO: sort by year when sort type is author??
            const na = (a as Book)?.meta.title || a.name;
            const nb = (b as Book)?.meta.title || b.name;
            if (asc) {
                return na > nb  ? 1 : -1;
            } else {
                return na < nb  ? 1 : -1;
            }
        }
        
    })

    for(var i = 0; i < tree.children.length; i++) {
        if (tree.children[i].isFolder()) {
            sortBookTree(tree.children[i] as BookFolder, asc);
        }
    }
}


export async function openMdFileInObsidian(path: string) {
    const leaf = app.workspace.getLeaf();
    return leaf.setViewState({
        type: 'markdown',
        state: {
            file: path,
        }
    });
}

export function showBookLocationInSystem(path: string) {
    window.open("file:///"+getDirPath(path));
}


export function getPropertyValue(file: TFile, propertyName: string) {
    if (!file) {
        return null;
    }
    const cache = app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.[propertyName];
}

export function getMobileRelativePath(fullpath: string) {
    const basePath = (app.vault.adapter as any).basePath
    const b = basePath.split("/");
    const f = fullpath.split("/");
    for (var i = 0; i < b.length; i++) {
        if (b[i] !== f[i]) {
            const rel = "../".repeat(b.length-i) + f.slice(i).join("/");
            return rel;
        }
    }
    
    if (f.length > b.length) {
        return f.slice(b.length).join("/");
    } else {
        return null;
    }
}
