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