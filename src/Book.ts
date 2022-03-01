
import * as utils from "./utils";
import { normalizePath, TFile } from "obsidian";
import { BookMetaMap, ext2type } from "./constants";

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
    progress: number;      // read progress,eg. reading page
    total?: number;         // eg. total pages
    cover?:　string;        // cover address，url or image path,
    note?: string;          // note file id or path for this book

    // others are depend on book type
    [key:string]: any;
}

export class AbstractBook {
    vid: string;
    path?: string;
    name: string;   // book name or folder name
    children? : Array<AbstractBook>;
    parent: AbstractBook;
    lost: boolean;

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
    constructor(parent: AbstractBook, vid: string, name: string,path: string, lost: boolean = false, children?: Array<AbstractBook>) {
        super(parent,vid,name,path,lost);
        this.children = children;
        if (!children) {
            this.children = new Array<AbstractBook>();
        }
    }

    push(absbook: AbstractBook) {
        this.children.push(absbook);
    }
}



export class Book extends AbstractBook {

    bid: string;        //[0-9a-zA-Z]{16,}
    hash?: string;      // md5 of file content
    citekey?: string;   

    ext: string;
    visual: boolean;
    
    meta: BookMeta;

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

    getId() {
        if (!this.bid) {
            this.bid = utils.generateBid();
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
                this.meta[key] = inputMeta[key];
            }

            for(const key in typeMeta) {
                this.meta[key] = inputMeta[key];
            }

        } else { // init book meta
            for(const key in basicMeta) {
                this.meta[key] = basicMeta[key].default;
            }

            const type = ext2type[this.ext];
            if (type && BookMetaMap[type]) {
                this.meta.type = type;
                const typeMeta = BookMetaMap[type];
                for(const key in typeMeta) {
                    this.meta[key] = typeMeta[key].default;
                }  
            }
        }
    }

    // make sure this book has bid
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
        return utils.safeWriteFile(filepath,content);
    }

    private getBookMetaString() {
        var content = "";
        content += "---\n";
        content += "book-meta: true\n";
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
            
            if (typeof val === "string") {
                if (!val) continue;
                content += `${key}: "${val}"\n`;
            } else if (typeof val === "object") {
                if (val.length === 0) continue;
                content += `${key}: ${val}\n`;
            } else {
                content += `${key}: ${val}\n`;
            }
        }
        content += "---\n"
        return content;
    }
}