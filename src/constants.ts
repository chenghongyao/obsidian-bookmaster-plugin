import { BookStatus } from "./Book";


export const MAIN_BOOKVAULT_ID = "00";
export const OB_BOOKVAULT_ID = "99";


export const BookMetaMap : {[type:string]:any}= {
    "basic": {
        "type": {
        },
        "title": {
            default: ""
        },
        "desc": {
            default: ""
        },
        "authors": {
            default: []
        },
        "tags": {
            default: []
        },
        "rating": {
            default: 0
        },
        "status": {
            default: BookStatus.UNREAD,
        },
        "progress": {
            default: 0,
        },
        "total": {
            default: 0,
        },
        "cover": {
            default: "",
        },
        "note": {
            default: "",
        }
    },
    "book": {
        "publish-date": {
            default: "",
        },
        "publisher": {
            default: "",
        },
        "doi": {
            default: "",
        }
    },
    "paper": {
        "publish-date": {
            default: "",
        },
        "publisher": {
            default: "",
        },
        "isbn": {
            default: "",
        }
    },
    "image": {

    }

};

export const ext2type : {[ext:string]:any}= {
    pdf: "paper",
    epub: "book",
    jpg: "image",
    png: "image",
    jpeg: "image",
    bmp: "image",
    gif: "image",
}
