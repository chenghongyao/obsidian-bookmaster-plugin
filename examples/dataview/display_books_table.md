
使用dataviewjs显示指定书库与文件夹下所有book的信息表格，需要自行修改vid与path

```dataviewjs
// 插件
const bmPlugin = dv.app.plugins.plugins['obsidian-bookmaster-plugin']

// 目标书库和路径
const vid = "00"
const path = "/target/folder/path/"

// 辅助变量和函数
const statusMark = {
	unread:'<font color="red">未读</font>',
	reading:'<font color="yellow">在读</font>',
	finished:'<font color="green">已读</font>'
}

const ratingMark = ['😐',"⭐","⭐⭐","⭐⭐⭐","⭐⭐⭐⭐","⭐⭐⭐⭐⭐"]


// 获取所有book
function getAllBooks(vid) {
    const books = []
    const _rec = (root) => {
        root.children.forEach((b) => {
            if (b.isFolder()) _rec(b);
            else books.push(b);
        })
    }
    _rec(bmPlugin.bookVaultManager.root.get(vid));
    return books
}                                                

// 返回 markdown 链接: [title](link)
function bookOpenLink(b) {
    if (b.bid) {
        return `[${b.meta.title || b.name}](obsidian://bookmaster?type=open-book&bid=${b.bid})`
    } else {
         return `[${b.meta.title || b.name}](obsidian://bookmaster?type=open-book&vid=${b.vid}&bpath=${encodeURIComponent(b.path)})`
    }
    
}

// 设置设置链接
function bookSettingLink(b) {
    if (b.bid) {
        return `[设置](obsidian://bookmaster?type=basic-book-setting&bid=${b.bid})`
    } else {
         return `[设置](obsidian://bookmaster?type=basic-book-setting&vid=${b.vid}&bpath=${encodeURIComponent(b.path)})`
       
    }
    return `[设置](obsidian://bookmaster?type=basic-book-setting&bid=${b.bid})`
}

// 返回 meta 文件链接, 
// TODO: when bid is undefine
function bookMetaLink(b) {
     return `[[${b.bid}.md|${b.title||b.name}]]`
}

// 获取第一个作者
function bookFirstAuthor(b) {
    const authors = b.meta.authors;
    if (authors) {
        if (authors.length > 1) {
            return `<b>${authors[0]}</b> 等`
        } else {
        return `<b>${authors}</b> `
        }
    }
}


// 获取所有 books
let books = getAllBooks(vid)
            .filter(b => b.path.startsWith(path))
            .sort(function (l, r) {
                const li = ["finished","reading","unread"].indexOf(l.meta.status);
                const ri = ["finished","reading","unread"].indexOf(r.meta.status);
                return li - ri;
            })
// 生成表格
dv.table(
    ["标题", "阅读状态", "作者","描述", "评分","设置"], // 标题
    books
     .map(b => [
                 bookOpenLink(b),  
                 statusMark[b.meta.status||"unread"],
                 bookFirstAuthor(b),
                 b.meta.desc,
                 ratingMark[b.meta.rating || 0],
                 bookSettingLink(b)
                ])) 

```