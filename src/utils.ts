import { App } from "obsidian";

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


export function isFolderExists(path: string) {
    return (app.vault.adapter as any).fs.existsSync(path) &&
            (app.vault.adapter as any).fs.statSync(path).isDirectory();
}

export function isFileExists(path: string) {
    return (app.vault.adapter as any).fs.existsSync(path) &&
    !(app.vault.adapter as any).fs.statSync(path).isDirectory();
}
export function getExtName(path: string) {
    if (path.lastIndexOf(".") === -1) return "";
    return path.substring(path.lastIndexOf(".")+1)
}
export function isValidBook(bookname: string,ext: string,validBookExts: Array<string>) {
    return !bookname.startsWith("~$") && !bookname.startsWith(".") && validBookExts.indexOf(ext) >= 0;
}
export function normalizePath(root: string,rpath:string) {
    // FIXME: more robust
    return root + "/" + rpath;
    // return (app.vault.adapter as any).path.join(root,rpath);
}