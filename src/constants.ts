export const ALLOWED_HEADERS =
    'Access-Control-Allow-Headers, Origin, Authorization,Accept,x-client-id, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, hypothesis-client-version';

export const mimeType = {
    '.ico': 'image/x-icon',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
    '.doc': 'application/msword',
    '.eot': 'application/vnd.ms-fontobject',
    '.ttf': 'application/x-font-ttf'
};

export const SUPPORT_BOOK_TYPES = [
					'pdf',
					'xls','ppt','doc','vsd','pub',
					'pptx','xlsx','pptx','docx','vsdx',
					'dwg','dwf','dxf','dgn','rvt',
					'svg','bmp','gif','jpg','png',
					'mp4','ogg','webm'
				];
// issn,isbn,lccn
export const BOOK_ATTR_MAP = {
    title: {
        label: "标题",
    },
    author: {
        label: "作者",
        placeholder: "以逗号分隔",
        type: "array",
    },
    "publish date": {
        label: "出版时间",
    },
    "lang": {
        label: "语言",
    },
    "booktype": {
        label: "类型",
    },
    "publisher": {
        label: "出版商",
    },
    "journal": {
        label: "期刊",
    },
    "citekey": {
        label: "citekey",
    },
    "doi": {
        label: "DOI",
    },
    "description": {
        label: "描述"
    },
    "abstract": {
        label: "摘要",
        type: "textarea",
    },
    "rating": {
        label: "评分",
    },
    "cover": {
        label: "封面"
    },
    "url": {
        label: "链接"
    },
    "tags": {
        label: "标签",
        placeholder: "以逗号分隔",
        type: "array",
    }
}