import { BookStatus } from "./Book";


export const MAIN_BOOKVAULT_ID = "00";
export const OB_BOOKVAULT_ID = "99";



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

export const ImageExts = ["jpg","jpeg","png","bmp",]

export const supportBookExts = [
    "pdf",
    "xlsx","xls","doc","docx","ppt","pptx", // office
    "jpg","jpeg","png","bmp",               //image
    "epub",
    "txt",
    "html"
];

export const ext2type : {[ext:string]:any}= {
    pdf: "paper",
    epub: "book",
    jpg: "image",
    png: "image",
    jpeg: "image",
    bmp: "image",
    gif: "image",
}
