
import * as utils from "./utils";
import { TFile } from "obsidian";

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

    constructor(parent: AbstractBook, vid: string, name: string,path: string) {
        this.parent = parent;
        this.vid = vid;
        this.name = name;
        this.path = path;
    }

    isFolder() {
        return Boolean(this.children)
    }
}


export class BookFolder extends AbstractBook {
    children: Array<AbstractBook>;    
    constructor(parent: AbstractBook, vid: string, name: string,path: string,children?: Array<AbstractBook>) {
        super(parent,vid,name,path);
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
    lost: boolean;
    
    meta: BookMeta;

    constructor(parent: AbstractBook, vid: string,  path: string, name: string,ext: string, bid?: string, visual: boolean = false, losted: boolean = false) {
        super(parent,vid,name,path);
        this.bid = bid;
        this.ext = ext;
        this.visual = visual;
        this.lost = visual ? false : losted;        
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

    loadBookMeta(file: TFile) {
        const cache = utils.app.metadataCache.getFileCache(file).frontmatter;
        // TODO: loadBookMetaFromFile
    }


    saveBookMeta(file: TFile) {
        // TODO: saveBookMeta

    }

    genBookMetaString() {
        // TODO: genBookMetaString
        // return content;
    }


}