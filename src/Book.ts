
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
    description: string;   //book description
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
    name: string;
    children? : Array<AbstractBook>;

    constructor(vid: string, name: string,path: string) {
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
    constructor(vid: string, name: string,path: string,children?: Array<AbstractBook>) {
        super(vid, name,path);
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

    constructor(vid: string, path: string, name: string,ext: string, visual: boolean = false, losted: boolean = false) {
        super(vid,name,path);
        this.ext = ext;
        this.visual = visual;
        if (visual) {
            this.lost = false;      
        }  else {
            this.lost = losted;  
        }
        
    }

    createId() {
        this.bid = utils.generateBid();
    }

    loadBookMetaFromFile(file: TFile) {
        const cache = utils.app.metadataCache.getFileCache(file).frontmatter;
        // TODO: loadBookMetaFromFile

    }

    genBookMetaString() {
        // TODO: genBookMetaString
        // return content;
    }


}