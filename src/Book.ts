
import * as utils from "./utils";
import { TFile } from "obsidian";
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

    // createId() {
    //     this.bid = utils.generateBid();
    // }
    
    //TODO: id property??
    getId() {
        if (!this.bid) {
            this.bid = utils.generateBid();
        }
        return this.bid;
    }


    loadBookData(file: string|any) {
        const basicMeta = BookMetaMap['basic'];

        // TODO: correct meta type
        if (file) { // load from file

            const inputMeta: any = typeof file === "string" ? utils.app.metadataCache.getCache(file).frontmatter : file;
            const typeMeta = BookMetaMap[inputMeta['type']];

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


    saveBookData(filepath: string) {
        const rawMeta = (utils.app.metadataCache.getCache(filepath).frontmatter as any) || {};
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

        const content = utils.genBookMetaString(rawMeta);
        utils.safeWriteFile(filepath,content);
    }
}