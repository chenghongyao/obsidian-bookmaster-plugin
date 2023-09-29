import { BookView } from "./view/BookView";
import * as utils from "./utils"
import { normalizePath, TFile } from "obsidian";
import { BOOK_TYPES, EXT2TYPE } from "./constants";




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

    constructor() {
        this.status = BookStatus.UNREAD;
        this.tags = [];
        this.authors = [];
        this.type = "unknown"
    }
}



export interface BookMetaOptions {
	type: "text"|"number"|"text-array"|"text-choice",
	label?: string,
	choices?: Array<string>;
	default?: any;
	// multiline?: boolean;
}
export interface BookMetaOptionMap {
	[name:string]:BookMetaOptions;
}
export const BookMetaMap : {[type:string]:BookMetaOptionMap}= {
    "basic": {
        "type": {
            type: "text",
            default: "unknown"
        },
        "title": {
            type: "text",
            // default: ""
        },
        "desc": {
            type: "text",
            // default: ""
        },
        
        "authors": {
            type: "text-array",
            default: [],
        },
        "tags": {
            type: "text-array",
            default: [],
        },
        "rating": {
            type: "number",
            default: 0
        },
        "status": {
            type: "text",
            default: BookStatus.UNREAD,
        },
        "progress": {
            type: "number",
            default: 0,
        },
        "total": {
            type: "number",
            // default: 0,
        },
        "cover": {
            type: "text",
            // default: "",
        },
        "note": {
            type: "text",
            // default: "",
        }
    },
    "book": {
        "publish-date": {
            type: "text",
            default: "",
        },
        "publisher": {
            type: "text",
            default: "",
        },
        "doi": {
            type: "text",
            default: "",
        }
    },
    "paper": {
        "publish-date": {
            type: "text",
            default: "",
        },
        "publisher": {
            type: "text",
            default: "",
        },
        "isbn": {
            type: "text",
            default: "",
        }
    },
    "image": {

    }

};



// create 16bit bid;
function generateBid() {
   
}


export abstract class AbstractBook {
    parent: BookFolder;
    vid: string;
    visual: boolean;

    name: string;
    path: string;

    lost: boolean;
    
    children?: Array<AbstractBook>;
    existFlag: boolean;

    constructor(parent: BookFolder, vid: string, name: string, path: string, lost: boolean = false) {
        this.parent = parent;
        this.vid = vid;
        this.lost = lost;
        this.visual = false;

        this.name = name;
        this.path = path;

        this.existFlag = false;
    }

    isFolder() {
        return Boolean(this.children);
    }


    getEntry() {
        return `${this.vid}:${this.path}`
    }


}

export class Book extends AbstractBook {
    ext: string;
    bid: string;
    meta: BookMeta;
    view: BookView;
    metaFile: TFile;
    
    // parent: AbstractBook, vid: string,  path: string, name: string,ext: string, bid?: string, visual: boolean = false, losted: boolean = false
    constructor(parent: BookFolder, vid: string, name: string, path: string, ext: string, bid?: string, lost: boolean = false) {
        super(parent, vid, name, path, lost);
        this.ext = ext;
        this.bid = bid;
        this.meta = new BookMeta();


        this.view = null;
        this.metaFile = null;
    }

    
    generateBid() {
        if (!this.bid) {
            const _all = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
            const N = 16;
            var res = '';
            for (var i = 0; i < N; i++)  {
                res += _all[Math.floor(Math.random()* _all.length)]
            }
    
            this.bid = res;
        }
        return this.bid;
    }

    private async getBookDescription(file: TFile) {
        const ryaml = /^(---\r?\n[\s\S]*\r?\n---)\r?\n/;
        const cont = await utils.app.vault.read(file);
        const g = ryaml.exec(cont)
        var len = 0;
        if (g && g[1]) {
            len = g[1].length;
        }
        return cont.substring(len+1).trim() ;
    }

    async loadBookData(file: TFile) {
        const basicMeta = BookMetaMap['basic'];

        // TODO: correct meta type
        if (file) { // load from file
            const inputMeta: any = utils.app.metadataCache.getFileCache(file).frontmatter;
            const typeMeta = BookMetaMap[inputMeta['type']];

            this.bid = inputMeta["bid"];
            this.vid = inputMeta["vid"];
            this.path = inputMeta["path"];
            this.name = inputMeta["name"];
            this.ext = inputMeta["ext"];
            this.visual = inputMeta["visual"];
            // this.hash = inputMeta["hash"];
            // this.citekey = inputMeta["citekey"];

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

            // TODO: book desc
            // this.meta["desc"] = await this.getBookDescription(file);

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

            // TODO: book desc
            // this.meta["desc"] = "";


        }
    }

    // make sure this book has bid
    // do NOT use this directly, use plugin.saveBookData() instead
    async saveBookData(datapath: string) {
        const filepath = normalizePath(datapath+`/${this.vid}` + "/"+this.bid+".md");

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

        var content = this.getBookMetaString();
        // TODO: book desc
        // if (this.meta["desc"]) {
        //     content += this.meta["desc"]
        // }
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
        // if (this.hash) content += `hash: ${this.hash}\n`;
        // if (this.citekey) content += `citekey: ${this.citekey}\n`;

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

export enum BookFolderType {
    PATH = "path",
    TAG = "tag",
    PUBLISH_YEAR = "publish_year",
    AUTHOR = "author",
}
export class BookFolder extends AbstractBook {
    count: number;
    type: BookFolderType;
    constructor(parent: BookFolder, vid: string, name: string, path: string, lost: boolean = false, type: BookFolderType = BookFolderType.PATH, children?: Array<AbstractBook>) {
        super(parent, vid, name, path, lost);
        this.type = type;
        this.children = children ? children :  new Array<AbstractBook>();
    }

    push(absbook: AbstractBook) {
        this.children.push(absbook);
    }

    clear() {
        this.children.length = 0;
    }
}



// import { BookView } from "./view/BookView";
// import * as utils from "./utils"
// import { normalizePath, TFile } from "obsidian";
// import { EXT2TYPE } from "./constant";
// import { reactive, Ref, ref } from "vue";




// export enum BookTreeSortType {
// 	PATH = "PATH",
// 	TAG = "TAG",
// 	AUTHOR = "AUTHOR",
// 	PUBLISH_YEAR = "PUBLISH_YEAR",
// }
// export enum BookStatus {
//     UNREAD = "unread",
//     READING = "reading",
//     FINISHED = "finished",
// }

// export class BookMeta {
//     // basic
//     type: string;          // book type
//     title: string;         // book title, default to filename
//     desc: string;          // book description
//     authors: Array<string>; // authors
//     tags: Array<string>;   // tags
//     rating: number;        // rating: 0-5
//     status: BookStatus;    // read status
//     "start-time": string    // TODO: start time 
//     "finish-time": string;  // TODO: finish time
//     progress: number;      // read progress,eg. reading page
//     total?: number;         // eg. total pages
//     cover?:　string;        // cover address，url or image path,
//     note?: string;          // note file id or path for this book

//     // others are depend on book type
//     [key:string]: any;

//     constructor() {
//         this.status = BookStatus.UNREAD;
//         this.tags = [];
//         this.authors = [];
//     }
// }



// export interface BookMetaOptions {
// 	type: "text"|"number"|"text-array"|"text-choice",
// 	label?: string,
// 	choices?: Array<string>;
// 	default?: any;
// 	// multiline?: boolean;
// }
// export interface BookMetaOptionMap {
// 	[name:string]:BookMetaOptions;
// }
// export const BookMetaMap : {[type:string]:BookMetaOptionMap}= {
//     "basic": {
//         "type": {
//             type: "text",
//         },
//         "title": {
//             type: "text",
//             // default: ""
//         },
//         "desc": {
//             type: "text",
//             // default: ""
//         },
//         "authors": {
//             type: "text-array",
//             default: [],
//         },
//         "tags": {
//             type: "text-array",
//             default: [],
//         },
//         "rating": {
//             type: "number",
//             default: 0
//         },
//         "status": {
//             type: "text",
//             default: BookStatus.UNREAD,
//         },
//         "progress": {
//             type: "number",
//             default: 0,
//         },
//         "total": {
//             type: "number",
//             // default: 0,
//         },
//         "cover": {
//             type: "text",
//             // default: "",
//         },
//         "note": {
//             type: "text",
//             // default: "",
//         }
//     },
//     "book": {
//         "publish-date": {
//             type: "text",
//             default: "",
//         },
//         "publisher": {
//             type: "text",
//             default: "",
//         },
//         "doi": {
//             type: "text",
//             default: "",
//         }
//     },
//     "paper": {
//         "publish-date": {
//             type: "text",
//             default: "",
//         },
//         "publisher": {
//             type: "text",
//             default: "",
//         },
//         "isbn": {
//             type: "text",
//             default: "",
//         }
//     },
//     "image": {

//     }

// };



// // create 16bit bid;
// function generateBid() {
   
// }


// export abstract class AbstractBook {
//     parent: BookFolder;
//     vid: string;
//     visual: Ref<boolean>;

//     name: Ref<string>;
//     path: Ref<string>;

//     lost: Ref<boolean>;
    
//     children?: Array<AbstractBook>;
//     existFlag: boolean;

//     constructor(parent: BookFolder, vid: string, name: string, path: string, lost: boolean = false) {
//         this.parent = parent;
//         this.vid = vid;
//         this.lost = ref(lost);
//         this.visual = ref(false);

//         this.name = ref(name);
//         this.path = ref(path);

//         this.existFlag = false;
//     }

//     isFolder() {
//         return Boolean(this.children);
//     }


//     getEntry() {
//         return `${this.vid}:${this.path}`
//     }


// }

// export class Book extends AbstractBook {
//     ext: Ref<string>;
//     bid: Ref<string>;
//     meta: any;
//     view: BookView;
//     metaFile: TFile;
    
//     // parent: AbstractBook, vid: string,  path: string, name: string,ext: string, bid?: string, visual: boolean = false, losted: boolean = false
//     constructor(parent: BookFolder, vid: string, name: string, path: string, ext: string, bid?: string, lost: boolean = false) {
//         super(parent, vid, name, path, lost);
//         this.ext = ref(ext);
//         this.bid = ref(bid);
//         this.meta = reactive(new BookMeta());


//         this.view = null;
//         this.metaFile = null;
//     }

    
//     generateBid() {
//         if (!this.bid) {
//             const _all = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
//             const N = 16;
//             var res = '';
//             for (var i = 0; i < N; i++)  {
//                 res += _all[Math.floor(Math.random()* _all.length)]
//             }

//             this.bid.value = res;
//             this.bid = res;
//         }
//         return this.bid;
//     }


//     loadBookData(file: TFile | any) {
//         const basicMeta = BookMetaMap['basic'];

//         // TODO: correct meta type
//         if (file) { // load from file

//             const inputMeta: any = file instanceof TFile ? utils.app.metadataCache.getFileCache(file).frontmatter : file;
//             const typeMeta = BookMetaMap[inputMeta['type']];

//             this.bid = inputMeta["bid"];
//             this.vid = inputMeta["vid"];
//             this.path = inputMeta["path"];
//             this.name = inputMeta["name"];
//             this.ext = inputMeta["ext"];
//             this.visual = inputMeta["visual"];
//             // this.hash = inputMeta["hash"];
//             // this.citekey = inputMeta["citekey"];

//             for(const key in basicMeta) {
//                 const val = inputMeta[key];
//                 if (basicMeta[key].type === "text-array") {
//                     this.meta[key] = val === undefined ? new Array() : (typeof val === "string" ? [val] : val);
//                 } else if(val !== undefined){
//                     this.meta[key] = inputMeta[key];
//                 }
//             }

//             for(const key in typeMeta) {
//                 this.meta[key] = inputMeta[key];
//             }

//         } else { // init book meta

//             for(const key in basicMeta) {
//                 if (basicMeta[key].default !== undefined) {
//                     this.meta[key] = basicMeta[key].default instanceof Array ?  Array.from(basicMeta[key].default) : basicMeta[key].default;

//                 }
//             }

//             if (this.meta.type === undefined) {
//                 this.meta.type = EXT2TYPE[this.ext] || "unknown";
//             }

//             if ( BookMetaMap[this.meta.type]) {
//                 const typeMeta = BookMetaMap[this.meta.type];
//                 for(const key in typeMeta) {
//                     if (typeMeta[key].default !== undefined) {
//                         this.meta[key] = typeMeta[key].default instanceof Array ?  Array.from(typeMeta[key].default) : typeMeta[key].default;
//                     }
//                 }  
//             }


//         }
//     }

//     // make sure this book has bid
//     // do NOT use this directly, use plugin.saveBookData() instead
//     async saveBookData(datapath: string) {
//         const filepath = normalizePath(datapath+"/"+this.bid+".md");

//         const rawMeta = (utils.app.metadataCache.getCache(filepath)?.frontmatter as any) || {};
//         // TODO: load from map
//         delete rawMeta['position'];

//         const basicMeta = BookMetaMap['basic'];
//         const typeMeta = this.meta.type && BookMetaMap[this.meta.type];

//         for(const key in basicMeta) {
//             if (this.meta[key] !== undefined) {
//                 rawMeta[key] = this.meta[key];
//             }
//         }

//         if (typeMeta) {
//             for(const key in typeMeta) {
//                 if (this.meta[key] !== undefined) {
//                     rawMeta[key] = this.meta[key];
//                 }
//             }    
//         }

//         const content = this.getBookMetaString();
//         return utils.safeWriteObFile(filepath,content,true);
//     }

//     private getBookMetaString() {
//         var content = "";
//         content += "---\n";
//         content += "bm-meta: true\n";
//         content += `bid: "${this.bid}"\n`;
//         content += `vid: "${this.vid}"\n`;
//         content += `path: "${this.path}"\n`;
//         content += `name: "${this.name}"\n`;
//         content += `ext: ${this.ext}\n`;
//         content += `visual: ${this.visual}\n`;
//         // if (this.hash) content += `hash: ${this.hash}\n`;
//         // if (this.citekey) content += `citekey: ${this.citekey}\n`;

//         for(const key in this.meta) {
//             const val = this.meta[key]; // TODO: correct type string

//             if (val === undefined) continue;
            
//             if (typeof val === "string") {
//                 if (!val) continue;
//                 content += `${key}: "${val}"\n`;
//             } else if (typeof val === "object") { // array
//                 if (val.length === 0) continue;
//                 content += `${key}:\n`;
//                 val.forEach((v: string) => {
//                     content += ` - ${v}\n`
//                 })
//             } else {
//                 content += `${key}: ${val}\n`;
//             }
//         }
//         content += "---\n"
//         return content;
//     }

// }

// export class BookFolder extends AbstractBook {
//     count: number;
//     constructor(parent: BookFolder, vid: string, name: string, path: string, lost: boolean = false, children?: Array<AbstractBook>) {
//         super(parent, vid, name, path, lost);
//         this.children = children ? children :  new Array<AbstractBook>();
//     }

//     push(absbook: AbstractBook) {
//         this.children.push(absbook);
//     }

//     clear() {
//         this.children.length = 0;
//     }
// }