import { App, Platform, TFile, TFolder } from "obsidian";
import { AbstractBook, Book, BookFolder } from "./Book";


export const app: App = (window as any).app as App;
export const appId: string = (app as any).appId as string;
export const fs: any = (app.vault.adapter as any).fs;




// path function
export function normalizePath(root: string,rpath:string) {
    // TODO: more robust
    if (Platform.isDesktop) {
        return (app.vault.adapter as any).path.join(root,rpath);
    } else {
        return root + (rpath.startsWith("/") ? rpath :"/" + rpath);
    }
    // 
}
export function getExtName(path: string) {
    if (path.lastIndexOf(".") === -1) return "";
    return path.substring(path.lastIndexOf(".")+1)
}

export function  getFolderName(path: string) {
    // TODO: more robust
    const g = /(.*)\/(?:.*)/.exec(path);
    if (g && g[1] === "")return "/";
    else return g?.[1];
}

export function  getFolderPath(filepath: string) {
    // TODO: more robust
    const g = /(.*)[\/\\](?:.*)/.exec(filepath);
    if (g && g[1] === "")return "/";
    else return g?.[1];
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


// obsidian file
export async function safeWriteObFile(path: string, data: ArrayBuffer|string, overwrite: boolean = false) {
    const vault = app.vault;
    const file = vault.getAbstractFileByPath(path) as TFile;
    if (file) {
        if (!overwrite)return;
        if (typeof data === "string") {
            return vault.modify(file,data as string);
        } else {
            return vault.modifyBinary(file, data as ArrayBuffer);
        }
    } else {
        const folderPath = getFolderPath(path);
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
            return vault.createBinary(path, data as ArrayBuffer).then(() => {
                return;
            })
        }

        
    }
}

export async function safeReadObFile(path:string) {
    const vault = app.vault;
    const file = vault.getAbstractFileByPath(path) as TFile
    return file ? vault.read(file) : "";
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

export async function openMdFileInObsidian(path: string) {
    const leaf = app.workspace.getLeaf();
    return leaf.setViewState({
        type: 'markdown',
        state: {
            file: path,
        }
    });
}

// helper
export async function pickFolder(): Promise<string>{
    if (Platform.isDesktop) {
        return require("electron").remote.dialog.showOpenDialog({properties:["openDirectory"]}).then((res: any) => {
            if (res.canceled) {
                return Promise.reject("pick folder canceled")
            } else {
                return res.filePaths[0] as string;
            }
        });
    } else {
        return Promise.reject("pick folder unsupported")
    }
}

export function encodeTemplate(template: string, params: {[key: string]:string}) {
    for (const key in params) {
        const patten = RegExp(`{{${key}}}`,'g'); 
        template = template.replace(patten,params[key]);
    }
    return template;
}


export function getPropertyValue(file: TFile, propertyName: string) {
    if (!file) {
        return null;
    }
    const cache = app.metadataCache.getFileCache(file);
    return cache?.frontmatter?.[propertyName];
}
