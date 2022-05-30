
import * as utils from "./utils";
import { normalizePath, TFile } from "obsidian";
import { BookMetaMap, EXT2TYPE } from "./constants";
import { BookTab } from "./view/BookView";


export enum BookTreeSortType {
	PATH = "PATH",
	TAG = "TAG",
	AUTHOR = "AUTHOR",
	PUBLISH_YEAR = "PUBLISH_YEAR",
}

export enum BookStatus {
    UNREAD = "unread",
    READING = "reading",
    FINISHED = "finished",
}

export class BookMeta {
    // basic
    type: string;          // book type
    title: string;         // book title, default to filename
    desc: string;          // book description
    authors: Array<string>; // authors
    tags: Array<string>;   // tags
    rating: number;        // rating: 0-5
    status: BookStatus;    // read status
    "start-time": string    // TODO: start time 
    "finish-time": string;  // TODO: finish time
    progress: number;      // read progress,eg. reading page
    total?: number;         // eg. total pages
    cover?:　string;        // cover address，url or image path,
    note?: string;          // note file id or path for this book

    // others are depend on book type
    [key:string]: any;
}



// create 16bit bid;
export function generateBid() {
    const _all = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const N = 16;
    var res = '';
    for (var i = 0; i < N; i++) 
        res += _all[Math.floor(Math.random()* _all.length)]
    return res;
}


export class AbstractBook {
    vid: string;
    path?: string;
    name: string;   // book name or folder name
    children? : Array<AbstractBook>;
    parent: AbstractBook;
    lost: boolean;
    
    _existsFlag: boolean;

    constructor(parent: AbstractBook, vid: string, name: string,path: string, lost: boolean) {
        this.parent = parent;
        this.vid = vid;
        this.name = name;
        this.path = path;
        this.lost = lost;
    }

    isFolder() {
        return Boolean(this.children)
    }
}


export class BookFolder extends AbstractBook {
    children: Array<AbstractBook>;   
    count: number;
    constructor(parent: AbstractBook, vid: string, name: string,path: string, lost: boolean = false, children?: Array<AbstractBook>) {
        super(parent,vid,name,path,lost);
        this.count = 0;
        this.children = children ? children :  new Array<AbstractBook>();
    }

    push(absbook: AbstractBook) {
        this.children.push(absbook);
    }
    removeAll() {
        this.children.length = 0;
    }
}



export class Book extends AbstractBook {

    bid: string;        //[0-9a-zA-Z]{16,}
    hash?: string;      // md5 of file content
    citekey?: string;   

    ext: string;
    visual: boolean;
    
    meta: BookMeta;
    tab: BookTab;

    constructor(parent: AbstractBook, vid: string,  path: string, name: string,ext: string, bid?: string, visual: boolean = false, losted: boolean = false) {
        super(parent,vid,name,path,visual ? false : losted);
        this.bid = bid;
        this.ext = ext;
        this.visual = visual;
        this.meta = new BookMeta();
    }

    hasId() {
        return Boolean(this.bid);
    }

    // do NOT use this directly, use plugin.getBookId() instead
    getId() {
        if (!this.bid) {
            this.bid = generateBid();
        }
        return this.bid;
    }


    loadBookData(file: any) {
        const basicMeta = BookMetaMap['basic'];

        // TODO: correct meta type
        if (file) { // load from file

            const inputMeta: any = typeof file === "string" ? utils.app.metadataCache.getCache(file).frontmatter : file;
            const typeMeta = BookMetaMap[inputMeta['type']];

            this.bid = inputMeta["bid"];
            this.vid = inputMeta["vid"];
            this.path = inputMeta["path"];
            this.name = inputMeta["name"];
            this.ext = inputMeta["ext"];
            this.visual = inputMeta["visual"];
            this.hash = inputMeta["hash"];
            this.citekey = inputMeta["citekey"];

            for(const key in basicMeta) {
                const val = inputMeta[key];
                if (basicMeta[key].type === "text-array") {
                    this.meta[key] = val === undefined ? new Array() : (typeof val === "string" ? [val] : val);
                } else if(val !== undefined){
                    this.meta[key] = inputMeta[key];
                }
            }

            for(const key in typeMeta) {
                this.meta[key] = inputMeta[key];
            }

        } else { // init book meta

            for(const key in basicMeta) {
                if (basicMeta[key].default !== undefined) {
                    this.meta[key] = basicMeta[key].default instanceof Array ?  Array.from(basicMeta[key].default) : basicMeta[key].default;

                }
            }

            if (this.meta.type === undefined) {
                this.meta.type = EXT2TYPE[this.ext] || "unknown";
            }

            if ( BookMetaMap[this.meta.type]) {
                const typeMeta = BookMetaMap[this.meta.type];
                for(const key in typeMeta) {
                    if (typeMeta[key].default !== undefined) {
                        this.meta[key] = typeMeta[key].default instanceof Array ?  Array.from(typeMeta[key].default) : typeMeta[key].default;
                    }
                }  
            }
        }
    }

    // make sure this book has bid
    // do NOT use this directly, use plugin.saveBookData() instead
    async saveBookData(datapath: string) {
        const filepath = normalizePath(datapath+"/"+this.bid+".md");

        const rawMeta = (utils.app.metadataCache.getCache(filepath)?.frontmatter as any) || {};
        // TODO: load from map
        delete rawMeta['position'];

        const basicMeta = BookMetaMap['basic'];
        const typeMeta = this.meta.type && BookMetaMap[this.meta.type];

        for(const key in basicMeta) {
            if (this.meta[key] !== undefined) {
                rawMeta[key] = this.meta[key];
            }
        }

        if (typeMeta) {
            for(const key in typeMeta) {
                if (this.meta[key] !== undefined) {
                    rawMeta[key] = this.meta[key];
                }
            }    
        }

        const content = this.getBookMetaString();
        return utils.safeWriteObFile(filepath,content,true);
    }

    private getBookMetaString() {
        var content = "";
        content += "---\n";
        content += "bm-meta: true\n";
        content += `bid: "${this.bid}"\n`;
        content += `vid: "${this.vid}"\n`;
        content += `path: "${this.path}"\n`;
        content += `name: "${this.name}"\n`;
        content += `ext: ${this.ext}\n`;
        content += `visual: ${this.visual}\n`;
        if (this.hash) content += `hash: ${this.hash}\n`;
        if (this.citekey) content += `citekey: ${this.citekey}\n`;

        for(const key in this.meta) {
            const val = this.meta[key]; // TODO: correct type string

            if (val === undefined) continue;
            
            if (typeof val === "string") {
                if (!val) continue;
                content += `${key}: "${val}"\n`;
            } else if (typeof val === "object") { // array
                if (val.length === 0) continue;
                content += `${key}:\n`;
                val.forEach((v: string) => {
                    content += ` - ${v}\n`
                })
            } else {
                content += `${key}: ${val}\n`;
            }
        }
        content += "---\n"
        return content;
    }
}