import {
	App,
	MarkdownView,
	Menu,
	Modal,
	normalizePath,
	Notice,
	ObsidianProtocolData,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	ViewCreator,
} from "obsidian";
import { around } from "monkey-around";

import {
	BookExplorerView,
	VIEW_TYPE_BOOK_EXPLORER_VIEW,
} from "./BookExplorerView";
import {
	BookProjectView,
	VIEW_TYPE_BOOK_PROJECT_VIEW,
} from "./BookProjectView";
import {
	AdvanceBookExplorerView,
	VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,
} from "./AdvanceBookExplorerView";
import {
	BookView,
	VIEW_TYPE_BOOK_VIEW
} from "./BookView";

import SearchBookModal from "./SearchBookModal";
import {SUPPORT_BOOK_TYPES} from "./constants"

import staticServer, { StaticServer } from './static-server'

interface BookNoteSettings {
	bookPath: string;
	bookSettingPath: string;

	useLocalWebViewerServer: boolean,
	webviewerRootPath: string,
	webviewerLocalPort: string,

	webviewerExternalServerAddress: string;

	openAllBookBySystem: boolean,
	openOfficeBookBySystem: boolean,

	selectionAnnotationLinkTemplate: string, // highlight,underline ,strikeout,squiggly,freetext 
	regionAnnotationLinkTemplate: string, // 
	currentPageLinkTemplage: string,

	fixedAnnotImageZoom: boolean,
	fixedAnnotImageZoomValue: string,
	addClickEventForAnnotImage: boolean,

	autoOpenProjectView: boolean, // when project note is opened
	copyNewAnnotationLink: boolean,

	bookTreeSortType: Number,
	bookTreeSortAsc: boolean,
}

const DEFAULT_SETTINGS: BookNoteSettings = {
	bookPath: "",
	bookSettingPath: "booknote",
	useLocalWebViewerServer: false,
	webviewerRootPath: "",
	webviewerLocalPort: "1448",

	webviewerExternalServerAddress: "https://relaxed-torvalds-5a5c77.netlify.app",

	openAllBookBySystem: false,
	openOfficeBookBySystem: false,


	selectionAnnotationLinkTemplate: "[{{content}}]({{url}})",
	regionAnnotationLinkTemplate: "![[{{img}}#center|{{width}}]]",
	currentPageLinkTemplage: "[**P{{page}}**]({{url}})",

	fixedAnnotImageZoom: true,
	fixedAnnotImageZoomValue: "2",

	addClickEventForAnnotImage: true,

	autoOpenProjectView: true,
	copyNewAnnotationLink: true,

	bookTreeSortType: 0,
	bookTreeSortAsc: true,
};



export default class BookNotePlugin extends Plugin {
	settings: BookNoteSettings;

	path: any;
	fs: any;

	bookTreeData: Array<any> = new Array();
	currentBookProjectFile: TFile;
	currentBookProjectBooks: Array<any> = new Array();

	localWebViewerServer: StaticServer;

	autoInsertAnnotationLink: boolean;

	// bookViews: Set<BookView> = new Set(); // TODO: remove this ,use map?
	bookViewMap: Map<string,BookView> = new Map();

	async onload() {

		this.path = (this.app.vault.adapter as any).path;
		this.fs = (this.app.vault.adapter as any).fs;

		await this.loadSettings();
	
		this.autoInsertAnnotationLink = false;

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new BookNoteSettingTab(this.app, this));

		// this.addRibbonIcon("dice", "opp", (evt) => {
		// 	new Notice((this.app.vault.adapter as any).getBasePath());
		// 	// this.updateBookTree();
		// 	this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW, "left");
		// 	// this.reactivateView(VIEW_TYPE_BOOK_VIEW,"center",true);
		// });

		this.addCommand({
			id: "open-book-explorer",
			name: "Open Book Explorer",
			callback: () => {
				this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW,'left');
			},
		});


		this.addCommand({
			id: "open-advance-book-explorer",
			name: "Open Advance Book Explorer",
			callback: () => {
				this.reactivateView(VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,'center',true);
			},
		});

		this.addCommand({
			id: "search-book",
			name: "Search Book",
			callback: () => {
				new SearchBookModal(this.app,this).open();
			},
		});

		this.addRibbonIcon("bold-glyph","书库",() => {
			this.reactivateView(VIEW_TYPE_BOOK_EXPLORER_VIEW,'left');
		});

		this.safeRegisterView(
			VIEW_TYPE_BOOK_EXPLORER_VIEW,
			(leaf) => new BookExplorerView(leaf, this)
		);

		this.safeRegisterView(
			VIEW_TYPE_BOOK_PROJECT_VIEW,
			(leaf) => new BookProjectView(leaf, this)
		);

		this.safeRegisterView(
			VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW,
			(leaf) => new AdvanceBookExplorerView(leaf, this)
		);

		this.safeRegisterView(
			VIEW_TYPE_BOOK_VIEW,
			(leaf) => new BookView(leaf,this)
		)

		this.registerBookProject();


		const self = this;
		const obProtocalHandler: any = {
			"annotation": function(params: ObsidianProtocolData) {
				const annotId = params["id"];
				const annotBook = params["book"];
				if (annotId && annotBook) {
					
					// TODO:还需要支持?
					if (self.isForceOpenBySystem(annotBook)) {
						self.openBookBySystem(annotBook);
					} else {
						self.showAnnotationById(annotBook,annotId);
					}
				} else {
					new Notice("标注链接参数错误");
				}
			},
			"open-book": function(params: ObsidianProtocolData) {
				self.getBookView(params["book"],true).then((view: BookView) => {
					view.openBook(params["book"],Number(params["page"]));
				})
			},
			"update-book-explorer": function(params: ObsidianProtocolData) {
				self.updateBookTree();
			}
		}

		this.registerObsidianProtocolHandler("booknote", (params) => {
			if (obProtocalHandler[params["type"]]) {
				obProtocalHandler[params["type"]](params);				
			}
		});



		this.registerMarkdownPostProcessor((secEl, ctx) => {

			if (this.settings.addClickEventForAnnotImage) {
				const reg = new RegExp(this.settings.bookSettingPath+"/books-data/((?:\\S+)/)?\\(annotations\\)(\\S+)/p(\\d+)r((?:\\d+(?:\\.\\d+)?,?){4})z(\\d+(?:\\.\\d+)?)i\\((\\w+-\\w+-\\w+-\\w+-\\w+)\\).png")
				secEl.querySelectorAll("span.internal-embed").forEach(async (el) => {
					
					const src = el.getAttr("src");
					const group = reg.exec(src);
					if (group) {
						const bookDir = group[1];
						const bookName = group[2];
						const annotId = group[6];
						const annotBook = this.path.join(bookDir || "",bookName);
						console.log("annoSrc:",src);
						console.log("annotBook:",annotBook)
						console.log("annotId:",annotBook)

						this.registerDomEvent(el as HTMLAnchorElement, "dblclick", (e) => {
							this.showAnnotationById(annotBook,annotId, false);
						});

						this.registerDomEvent(el as HTMLAnchorElement, "click", (e) => {
							if (e.ctrlKey === true) {
								// TODO: click导致页面无法正常跳转！！
								this.showAnnotationById(annotBook,annotId,true);
							}
						});

						
					}				
				});
			}
			
		});


		if (this.settings.useLocalWebViewerServer) {
			this.startStaticServer();
		}

	}

	startStaticServer() {
		this.localWebViewerServer = staticServer(this.settings.webviewerRootPath,this.settings.webviewerLocalPort,this);
		this.localWebViewerServer.listen();
	}

	stopStaticServer() {
		if (this.localWebViewerServer) {
			this.localWebViewerServer.close();
			this.localWebViewerServer = null;
		}
	}

	parseXfdfString(xfdfString: string) {
		return new DOMParser().parseFromString(xfdfString,'text/xml');	
	}

	registerBookProject() {
		const self = this;
		// add item in more options
		this.register(
			around(MarkdownView.prototype, {
				onMoreOptionsMenu(next) {
					return function (menu: Menu) {
						const file = this.file;
						if (!file || !self.getPropertyValue(file, "booknote-plugin")) {
							return next.call(this, menu);
						}

						menu.addItem((item) => {
							// TODO 根据Project View 是否已经显示
							item.setTitle("打开BookNote工程").onClick(() => {
								self.updateBookProject(file);
								self.reactivateView(VIEW_TYPE_BOOK_PROJECT_VIEW, "right");
							});
						});

						const books = self.getPropertyValue(file, "booknote-books");
						if (books && books.length > 0 && books[0]) {
							menu.addItem((item) => {
								item.setTitle("OpenBook").onClick(() => {
									// console.log(books[0]);
									self.openBookInBookView(books[0], true);
								});
							});
						}

						menu.addSeparator();

						return next.call(this, menu);
					};
				},
			})
		);

		// TODO:窗口激活也会响应file-open???
		// this.registerEvent(this.app.workspace.on)
		// this.registerEvent(this.app.workspace.on("file-open",(file) => {
		// 	if (this.settings.autoOpenProjectView && file && self.getPropertyValue(file, "booknote-plugin")) {
		// 		self.updateBookProject(file);
		//		self.reactivateView(VIEW_TYPE_BOOK_PROJECT_VIEW, "right");
		// 	}
		// }))
	}

	private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

	onunload() {
		this.stopStaticServer();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


	async showAnnotationById(book: string, id: string, newPanel?: boolean) {
		this.getBookView(book,newPanel).then((view: BookView) => {
			view.openBook(book).then((view: BookView) => {
				view.showAnnotation(id);
				this.app.workspace.setActiveLeaf(view.leaf); //TODO: 页面上点击无法激活？？，这里再次激活

			})
		})
	}
	async reactivateView(type: string, dir?: string, split?: boolean) {

		var leaf;
		if (this.app.workspace.getLeavesOfType(type).length == 0) {
			if (dir === "left") {
				leaf = this.app.workspace.getLeftLeaf(split);
			} else if (dir == "right") {
				leaf = this.app.workspace.getRightLeaf(split);
			} 
			else {
				leaf = this.app.workspace.getLeaf(split && !(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			}
			await leaf.setViewState({
				type: type,
				active: true,
			});
		}

		this.app.workspace.revealLeaf(this.app.workspace.getLeavesOfType(type)[0]);
	}

	// copy from obsidian-annotator
	getPropertyValue(file: TFile, propertyName: string) {
		if (!file) {
			return null;
		}
		const cache = this.app.metadataCache.getFileCache(file);
		return cache?.frontmatter?.[propertyName];
	}

	private walkByFolder(root: string, tree: Array<any>) {
	
		const self = this;
		const files = self.fs.readdirSync(self.path.join(self.settings.bookPath, root));
		files.forEach(function (filename: string) {
			const filepath = self.path.join(root, filename);
			const stat = self.fs.statSync(self.path.join(self.settings.bookPath, filepath));
			if (stat.isDirectory() && !filepath.startsWith(".")) {
				const arr = new Array<any>();
				tree.push({ name: filename, path: filepath, children:  arr});
				self.walkByFolder(filepath,arr);
			} else {
				const ext = self.path.extname(filename).substr(1);
				if (self.isBookSupported(filename, ext)) { // window 下的临时文件
					const bookobj = {name:filename,path:filepath,ext:ext ? ext : "unknown"};
					tree.push(bookobj);
				}
			}
		});
	}
	private insertTagNode(tagRoot: string,tags: Array<string>, tagMap: Map<string,Array<any>>,tree: Array<any>,i: number,obj:any) {
		if (i === tags.length) {
			tree.push(obj);
		} else {
			const nxt = tagRoot + tags[i];
			let arr = tagMap.get(nxt);
			if (!arr) {
				arr = new Array<any>();
				tagMap.set(nxt,arr);
				tree.push({name:tags[i],children:arr});
			}
			this.insertTagNode(nxt+"/",tags,tagMap,arr,i+1,obj);
		}
	}

	private walkByTag(tagMap: Map<string,Array<any>>,tree: Array<any>, root: string) {

		const self = this;
		const files = this.fs.readdirSync(this.path.join(this.settings.bookPath, root));
		files.forEach(function (filename: string) {
			const bookpath = self.path.join(root, filename);
			const stat = self.fs.statSync(self.path.join(self.settings.bookPath, bookpath));
			if (stat.isDirectory() && !bookpath.startsWith(".")) {
				self.walkByTag(tagMap,tree, root+"/"+filename);
			} else {
				const ext = self.path.extname(filename).substr(1);
				if (self.isBookSupported(filename,ext)) { // window 下的临时文件
					const datapath = self.normalizeBookDataPath(root+"/"+filename+".md")
					const datafile = self.app.vault.getAbstractFileByPath(datapath) as TFile;
					const bookobj = {name:filename,path:bookpath,ext:ext ? ext : "unknown"};

					if (datafile && self.app.metadataCache.getFileCache(datafile).frontmatter["tags"]) {
						const tags = self.app.metadataCache.getFileCache(datafile).frontmatter["tags"].split(",");
						for (var i = 0; i < tags.length; i++) {
							const tag = tags[i].trim();
							if (tagMap.get(tag)) {
								tagMap.get(tag).push(bookobj);
							} else {
								self.insertTagNode("",tag.split("/"),tagMap,tree,0,bookobj);
							}
						}	
					} else {
						tagMap.get("unknown").push(bookobj);
					}
				}
			}
		});
	}
	private walkByAuthor(map: Map<string,Array<any>>,tree: Array<any>, root: string) {

		const self = this;
		const files = this.fs.readdirSync(this.path.join(this.settings.bookPath, root));
		files.forEach(function (filename: string) {
			const bookpath = self.path.join(root, filename);
			const stat = self.fs.statSync(self.path.join(self.settings.bookPath, bookpath));
			if (stat.isDirectory() && !bookpath.startsWith(".")) {
				self.walkByAuthor(map,tree, root+"/"+filename);
			} else {
				const ext = self.path.extname(filename).substr(1);
				if (self.isBookSupported(filename,ext)) { // window 下的临时文件
					const datapath = self.normalizeBookDataPath(root+"/"+filename+".md")
					const datafile = self.app.vault.getAbstractFileByPath(datapath) as TFile;
					const bookobj = {name:filename,path:bookpath,ext:ext ? ext : "unknown"};
					if (datafile && self.app.metadataCache.getFileCache(datafile).frontmatter["author"]) {
						
						const authors = self.app.metadataCache.getFileCache(datafile).frontmatter["author"].split(",");
						for (var i = 0; i < authors.length; i++) {
							const author = authors[i].trim();
							if (!map.get(author)) {
								const arr = new Array<any>();
								tree.push({name: author, children: arr })
								map.set(author, arr);
							} 

							map.get(author).push(bookobj);
						}	
					} else {
						map.get("unknown").push(bookobj);
					}
				}
			}
		});
	}

	private walkByPublishDate(map: Map<string,Array<any>>,tree: Array<any>, root: string) {

		const self = this;
		const files = this.fs.readdirSync(this.path.join(this.settings.bookPath, root));
		files.forEach(function (filename: string) {
			const bookpath = self.path.join(root, filename);
			const stat = self.fs.statSync(self.path.join(self.settings.bookPath, bookpath));
			if (stat.isDirectory() && !bookpath.startsWith(".")) {
				self.walkByPublishDate(map,tree, root+"/"+filename);
			} else {
				const ext = self.path.extname(filename).substr(1);
				if (self.isBookSupported(filename,ext)) { // window 下的临时文件
					const datapath = self.normalizeBookDataPath(root+"/"+filename+".md")
					const datafile = self.app.vault.getAbstractFileByPath(datapath) as TFile;
					const bookobj = {name:filename,path:bookpath,ext:ext ? ext : "unknown"};
					if (datafile && self.app.metadataCache.getFileCache(datafile).frontmatter["publish date"]) {
						// TODO: more robust??
						const dates = self.app.metadataCache.getFileCache(datafile).frontmatter["publish date"].split("/");
						const year = dates[0].trim();
						if (!map.get(year)) {
							const arr = new Array<any>();
							tree.push({name: year, children: arr })
							map.set(year, arr);
						} 
						map.get(year).push(bookobj);
					} else {
						map.get("unknown").push(bookobj);
					}
				}
			}
		});
	}

	private sortBookTree(tree: Array<any>) {

		tree.sort((a:any,b:any)=> {
			if (Boolean(a.children) !== Boolean(b.children)) {
				if (a.children) return -1;
				else return 1;
			} else {
				if (a.children && a.name === "unknown") {
					return 1;
				} else if (b.children && b.name === "unknown") {
					return -1;
				}
				else if (this.settings.bookTreeSortAsc)
					return a.name > b.name ? 1 : -1;
				else
					return a.name < b.name ? 1 : -1;
			}
		})

		for(var i = 0; i < tree.length; i++) {
			if (tree[i].children) {
				this.sortBookTree(tree[i].children);
			}
		}
	}

	updateBookTree() {
		if (!this.isBookPathValid()) return;
		this.bookTreeData.length = 0;

		if (this.settings.bookTreeSortType === 0) {
			this.walkByFolder("",this.bookTreeData);
		} else if (this.settings.bookTreeSortType === 1) {
			const map: Map<string,Array<any>> = new Map();
			map.set("unknown", new Array<any>());
			this.bookTreeData.push({name:"unknown",children: map.get("unknown")})
			this.walkByTag(map,this.bookTreeData,"");
		} else if (this.settings.bookTreeSortType == 2) {
			const map: Map<string,Array<any>> = new Map();
			map.set("unknown", new Array<any>());
			this.bookTreeData.push({name:"unknown",children: map.get("unknown")})
			this.walkByAuthor(map,this.bookTreeData,"");
		} else {
			const map: Map<string,Array<any>> = new Map();
			map.set("unknown", new Array<any>());
			this.bookTreeData.push({name:"unknown",children: map.get("unknown")})
			this.walkByPublishDate(map,this.bookTreeData,"");
		}
		this.sortBookTree(this.bookTreeData);
	}

	isBookPathValid() {
		return (
			this.settings.bookPath &&
			this.fs.existsSync(this.settings.bookPath) &&
			this.fs.statSync(this.settings.bookPath).isDirectory()
		);
	}

	isBookSupported(bookname:string, ext: string) {
		return !bookname.startsWith("~$") && !bookname.startsWith(".") && SUPPORT_BOOK_TYPES.indexOf(ext) >= 0;
	}


	normalizeBookPath(path: string) {
		return this.path.join(this.settings.bookPath, path);
	}

	normalizeBookDataPath(path: string) {
		return normalizePath(this.settings.bookSettingPath+"/books-data/"+path);
	}


	openBookBySystem(path: string) {
		if(path.startsWith("http://") || path.startsWith("https://")) {
			window.open(path);
		} else {
			window.open("file://" + this.normalizeBookPath(path));
		}
	}

	isForceOpenBySystem(path: string) {
		return this.settings.openAllBookBySystem 
			|| path.startsWith("http://") || path.startsWith("https://") 
			|| (this.settings.openOfficeBookBySystem && this.path.extname(path).substr(1) != "pdf"); // TODO: office book mean not pdf book?
	}

	openBookInBookView(path: string, newPanel?: boolean) {
		if (this.isForceOpenBySystem(path)) {
			this.openBookBySystem(path);
		} else {
			this.getBookView(path, newPanel).then(view => {
						view.openBook(path);
					});
		}
	}

	updateBookProject(file: TFile) {
		this.currentBookProjectFile = file;
		if (
			this.currentBookProjectFile &&
			this.getPropertyValue(this.currentBookProjectFile, "booknote-plugin") === true
		) {
			const bookpaths = this.getPropertyValue(
				this.currentBookProjectFile,
				"booknote-books"
			);

			this.currentBookProjectBooks.length = 0;

			if (bookpaths) {
				const self = this;
				this.currentBookProjectBooks.length = 0;
				bookpaths.forEach((filepath: string) => {
					if (!filepath)return;

					const regUrl = /^\[(.*)\]\((http(s)?:\/\/[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\*\+,;=.]+)\)$/
					const urlGroup = regUrl.exec(filepath);
					if (urlGroup) {
						self.currentBookProjectBooks.push({
							name: urlGroup[1],
							path: urlGroup[2],
							isUrl: true,
						})
					} else {
						const ext = this.path.extname(filepath).substr(1);
						self.currentBookProjectBooks.push({
							name: this.path.basename(filepath),
							path: filepath,
							ext: ext ? ext : "unknown",
						});	
					}
				});
			}
		}
	}


	async getBookView(path?: string, newPanel?: boolean) {
		
		if (path) {
			let view = this.bookViewMap.get(path);
			if (view) {
				this.app.workspace.revealLeaf(view.leaf);
				// this.app.workspace.setActiveLeaf(view.leaf);
				return view;
			}
		}
		


		newPanel = newPanel || (this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW).length === 0);
		let leaf = null;
		if (newPanel) {
			leaf = this.app.workspace.getLeaf(!(this.app.workspace.activeLeaf.view.getViewType() === "empty"));
			await leaf.setViewState({
				type: VIEW_TYPE_BOOK_VIEW,
				active: true,
			});
		} else {
			const act = this.app.workspace.getActiveViewOfType(BookView);
			leaf = act ? act.leaf : this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW)[0];
		}

		this.app.workspace.revealLeaf(leaf);
		// this.app.workspace.setActiveLeaf(leaf);
		return leaf.view as BookView;
	
	}

	getBookAttrs(bookpath: string) {
		const dataPath = this.normalizeBookDataPath(bookpath+".md");
		const file = this.app.vault.getAbstractFileByPath(dataPath) as TFile;
		if (file) {
			const frontmatter = this.app.metadataCache.getFileCache(file).frontmatter;
			delete frontmatter.position;
			// console.log(cache.frontmatter);
			return frontmatter;
		} else {
			return null
		}
	}

	genBootAttrMeta(attr: any) {
		var content : string;
		content = "---\n";
		for(const key in attr) {
			content += `${key}: ${attr[key]}\n`;
		}
		content += '---\n'
		return content;
	}

	async safeWriteFile(path: string, data: Buffer|string, overwrite: boolean) {

		const file = this.app.vault.getAbstractFileByPath(path) as TFile;
		
		if (file) {
			if (!overwrite)return;
			if (typeof data === "string") {
				this.app.vault.modify(file,data as string);
			} else {
				this.app.vault.modifyBinary(file, data as Buffer);
			}
		} else {
			// cant not write to file if folder doesn't exists
			// TODO: ob api to get folder?
			const folderPath = this.path.dirname(path);
			const folder = this.app.vault.getAbstractFileByPath(folderPath) as TFolder;
			if (!folder) {
				await this.app.vault.createFolder(folderPath);
			}

			if (typeof path === "string") {
				this.app.vault.create(path, data as string);
			} else {
				this.app.vault.createBinary(path, data as Buffer);
			}

			
		}

	}


	saveBookAttrs(bookpath: string, attrs: any) {
		const dataPath = this.normalizeBookDataPath(bookpath+".md");
		const content = this.genBootAttrMeta(attrs);
		
		this.safeWriteFile(dataPath,content,true).then(() => {
			new Notice("已保存");
		})
		
	}


	saveBookAnnotations(bookpath: string, xfdfDoc: Document) {
		const xfdfString = new XMLSerializer().serializeToString(xfdfDoc);
		const dataPath = this.normalizeBookDataPath(bookpath+".xml");		
		this.safeWriteFile(dataPath,xfdfString,true);
	}

	async getBookAnnotations(bookpath: string) {
		const file = this.app.vault.getAbstractFileByPath(this.normalizeBookDataPath(bookpath+".xml")) as TFile;
		if (file)
			return this.app.vault.read(file);
		else {
			return null;
		}
	}

	//TODO: 文献解析类
	parseRisFile(content: string) {
		const attrs:any = {};
		const ris2attr:any = {
			TY:"reference type",
			AU:"author",
			"TI":"title",
			SN:"ISSN/ISBN",
			"SP":"start page",
			"PY": "publish date"
			};
		const reg = /(.*?)-(.*)/;
		const lines = content.split("\n");
		for(var i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line == "")break;
			const res = reg.exec(line);
			if (!res)continue;
			const key = res[1].trim();
			const value = res[2].trim();
			if (key == "ER")break;
			const attrkey = ris2attr[key] ? ris2attr[key] : key;
			if (attrs[attrkey]) {
				attrs[attrkey] += ","+value
			} else {
				attrs[attrkey] = value;
			}

		}

		return attrs;
	}

	// isUrlBook(path: string) {
	// 	return path.startsWith("http://") || path.startsWith("https://");
	// }

}

class BookNoteSettingTab extends PluginSettingTab {
	plugin: BookNotePlugin;

	constructor(app: App, plugin: BookNotePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "BookNote" });

		new Setting(containerEl)
			.setName("书库根路径")
			.setDesc("使用绝对路径，可以使用库外的目录")
			.addText((text) =>
				text.setValue(this.plugin.settings.bookPath).onChange(async (value) => {
					this.plugin.settings.bookPath = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
		.setName("配置文件路径")
		.setDesc("必须使用库内的路径")
		.addText((text) =>
			text.setValue(this.plugin.settings.bookSettingPath).onChange(async (value) => {
				this.plugin.settings.bookSettingPath = value;
				await this.plugin.saveSettings();
			})
		);
		
		new Setting(containerEl)
			.setName("使用本地服务器")
			.setDesc("使用本地服务器需要设置WebViewer库路径和端口")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.useLocalWebViewerServer).onChange(async (value) => {
					this.plugin.settings.useLocalWebViewerServer = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.startStaticServer();
					} else {
						this.plugin.stopStaticServer();
					}
				})
			});

		new Setting(containerEl)
			.setName("WebViewer库路径")
			.setDesc("使用本地服务器时有效，使用绝对路径")
			.addText((text) =>
				text.setValue(this.plugin.settings.webviewerRootPath).onChange(async (value) => {
					this.plugin.settings.webviewerRootPath = value;
					await this.plugin.saveSettings();
					// TODO: value check and is server started?
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.stopStaticServer();
						this.plugin.startStaticServer();
					}
				})
			);

		new Setting(containerEl)
			.setName("本地服务器端口")
			.setDesc("使用本地服务器时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.webviewerLocalPort).onChange(async (value) => {
					this.plugin.settings.webviewerLocalPort = value;
					await this.plugin.saveSettings();
					if (this.plugin.settings.useLocalWebViewerServer) {
						this.plugin.stopStaticServer();
						this.plugin.startStaticServer();
					}
				})
			});

		new Setting(containerEl)
			.setName("WebViewer远程服务器")
			.setDesc("不使用本地服务器时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.webviewerExternalServerAddress).onChange(async (value) => {
					this.plugin.settings.webviewerExternalServerAddress = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("使用默认应用打开所有书籍")
			.setDesc("使能时双击书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openAllBookBySystem).onChange(async (value) => {
					this.plugin.settings.openAllBookBySystem = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("使用默认应用打开Office书籍")
			.setDesc("使能时双击Office书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openOfficeBookBySystem).onChange(async (value) => {
					this.plugin.settings.openOfficeBookBySystem = value;
					await this.plugin.saveSettings();

				})
			});

		new Setting(containerEl)
			.setName("选文摘录模板")
			.setDesc("选中文字时的模板(如高亮，下划线等)\n可用命令包括page,url,content,img,comment,width,height")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.selectionAnnotationLinkTemplate).onChange(async (value) => {
					this.plugin.settings.selectionAnnotationLinkTemplate = value;
					await this.plugin.saveSettings();
				})
			});
		
		new Setting(containerEl)
			.setName("区域摘录模板")
			.setDesc("非文字类摘录时的模板(如框选等)\n可用命令包括page,url,img,comment,width,height")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.regionAnnotationLinkTemplate).onChange(async (value) => {
					this.plugin.settings.regionAnnotationLinkTemplate = value;
					await this.plugin.saveSettings();
				})
			});

		new Setting(containerEl)
			.setName("当前页回链模板")
			.setDesc("可用命令包括page,url")
			.addTextArea((text) => {
				text.setValue(this.plugin.settings.currentPageLinkTemplage).onChange(async (value) => {
					this.plugin.settings.currentPageLinkTemplage = value;
					await this.plugin.saveSettings();
				})
			});
		
		new Setting(containerEl)
			.setName("摘录截图使用固定比例")
			.setDesc("禁止则使用阅读时的缩放等级\n固定比例有利于所有截图不受阅读时的影响，保持统一比例")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fixedAnnotImageZoom).onChange(async (value) => {
					this.plugin.settings.fixedAnnotImageZoom = value;
					await this.plugin.saveSettings();

				})
			});	

		new Setting(containerEl)
			.setName("固定的摘录截图比例")
			.setDesc("启用固定比例时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.fixedAnnotImageZoomValue).onChange(async (value) => {
					this.plugin.settings.fixedAnnotImageZoomValue = value;
					await this.plugin.saveSettings();
				})
			})

		new Setting(containerEl)
			.setName("为图片摘录添加双击响应")
			.setDesc("启用后双击笔记中的标注图片可自动跳转到原文\n需要图片路径满足规定格式")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.addClickEventForAnnotImage).onChange(async (value) => {
					this.plugin.settings.addClickEventForAnnotImage = value;
					await this.plugin.saveSettings();
				})
			})

		// new Setting(containerEl)
		// 	.setName("打开工程文件时自动打开工程视图")
		// 	.setDesc("每次打开工程文件时都弹出或更新工程视图")
		// 	.addToggle((toggle) => {
		// 		toggle.setValue(this.plugin.settings.autoOpenProjectView).onChange(async (value) => {
		// 			this.plugin.settings.autoOpenProjectView = value;
		// 			await this.plugin.saveSettings();
		// 		})
		// 	})

		new Setting(containerEl)
			.setName("自动复制新标注的回链到剪贴板")
			.setDesc("每次在阅读器添加标注时自动复制回链到剪贴板")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.copyNewAnnotationLink).onChange(async (value) => {
					this.plugin.settings.copyNewAnnotationLink = value;
					await this.plugin.saveSettings();
				})
			})

	

	}
}
