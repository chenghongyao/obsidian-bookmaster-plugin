import { App, Platform, TFile, TFolder } from "obsidian";
import { AbstractBook, BookFolder } from "./Book";

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

export function getExtName(path: string) {
    if (path.lastIndexOf(".") === -1) return "";
    return path.substring(path.lastIndexOf(".")+1)
}

export function  getDirName(path: string) {
    // TODO: more robust
    const g = /(.*)\/(?:.*)/.exec(path);
    if (g && g[1] === "")return "/";
    else return g?.[1];
}

export function isValidBook(bookname: string,ext: string,validBookExts: Array<string>) {
    return !bookname.startsWith("~$") && !bookname.startsWith(".") && validBookExts.indexOf(ext) >= 0;
}
export function normalizePath(root: string,rpath:string) {
    // TODO: more robust
    return root + "/" + rpath;
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
        const folderPath = getDirName(path);
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
