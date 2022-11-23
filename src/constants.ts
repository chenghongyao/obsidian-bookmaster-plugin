
export const EXT2TYPE : {[ext:string]:any}= {
    pdf: "book",
    epub: "book",
    jpg: "image",
    png: "image",
    jpeg: "image",
    bmp: "image",
    gif: "image",
}


export const ImageExts = ["jpg","jpeg","png","bmp","jfif"]
export const AudioExts = ["wav","mp3","ogg"] // support by <audio>
export const VideoExts = ["mp4"] // support by <video>
export const OfficeExts = [ "xlsx","xls","doc","docx","ppt","pptx"]

export const supportedBookExts = [
    "pdf",
    // ...OfficeExts,
    // ...ImageExts,               //image
    // ...AudioExts,
    // ...VideoExts,
    "epub",
    "txt",
    "html"
];


export const BOOK_TYPES = [
    "book",
    "article",
    "conference",
    "thesis",
    "web",
    "movie",
    "unknown",
];
