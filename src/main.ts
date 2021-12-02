import {
	App,
	Editor,
	FileView,
	ItemView,
	MarkdownView,
	Menu,
	Modal,
	normalizePath,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	TFolder,
	ViewCreator,
	WorkspaceLeaf,
} from "obsidian";
import { around } from "monkey-around";

import {SUPPORT_BOOK_TYPES} from "./constants"
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

// import staticServer, { StaticServer } from './static-server'
// import * as http from "http";

interface BookNoteSettings {
	bookPath: string;
	bookDataPath: string;

	useLocalWebViewerServer: boolean,
	webviewerRootPath: string,
	webviewerLocalPort: string,

	webviewerExternalServerAddress: string;

	openAllBOokBySystem: boolean;
	openOfficeBookBySystem: boolean;
}

const DEFAULT_SETTINGS: BookNoteSettings = {
	bookPath: "",
	bookDataPath: "booknote/books-data",
	useLocalWebViewerServer: false,
	webviewerRootPath: "",
	webviewerLocalPort: "1448",

	webviewerExternalServerAddress: "https://relaxed-torvalds-5a5c77.netlify.app",

	openAllBOokBySystem: false,
	openOfficeBookBySystem: false,
};

export default class BookNotePlugin extends Plugin {
	settings: BookNoteSettings;
	path: any;
	fs: any;

	bookTreeData: Array<any>
	currentBookProjectFile: TFile;
	currentBookProjectBooks: Array<any>;

	// TODO: 内建服务器
	staticServer: any;
	localWebViewerServer: any;

	async onload() {

		this.path = (this.app.vault.adapter as any).path;
		this.fs = (this.app.vault.adapter as any).fs;


		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

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
				this.reactivateView(VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW);
			},
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

		this.registerObsidianProtocolHandler("booknote", (params) => {
			if (params["type"] === "annotation") {
				const annotId = params["id"];
				const annotBook = params["book"];
				if (annotId && annotBook) {
					
					// TODO:还需要支持?
					if (this.isForceOpenBySystem(annotBook)) {
						this.openBookBySystem(annotBook);
					} else {
						this.getBookView().then(view => {
							view.openBook(annotBook).then(view => {
								view.showAnnotation(annotId);
							})
						})
					}
				} else {
					new Notice("标注链接参数错误");
				}
			}
		});


		
		// console.log(http);
		// if (this.settings.useLocalWebViewerServer) {
		// 	this.localWebViewerServer = staticServer(this.settings.webviewerRootPath,this.settings.webviewerLocalPort,this);
		// 	this.register(() => {
		// 		if (this.localWebViewerServer) this.localWebViewerServer.close();
		// 	})
		// }

		// TODO: booknote load before static server
		// console.log((this.app as any).plugins.plugins["obsidian-static-file-server"]);

		if (this.settings.useLocalWebViewerServer) {
			this.startStaticServer();
		}

	}

	startStaticServer() {
		// static server plugin may loaded after booknote
		const plugins = (this.app as any).plugins.plugins;
		if (plugins["obsidian-static-file-server"]) {
			this.localWebViewerServer = this.staticServer(this.settings.webviewerRootPath,this.settings.webviewerLocalPort,
										(this.app as any).plugins.plugins["obsidian-static-file-server"]);
			this.localWebViewerServer.listen();
			this.register(this.stopStaticServer);
		} else {
			setTimeout(this.startStaticServer,500);
		}	
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
						if (books && books.length > 0) {
							menu.addItem((item) => {
								item.setTitle("OpenBook").onClick(() => {
									// console.log(books[0]);
									self.openBookInBookView(books[0]);
								});
							});
						}

						menu.addSeparator();

						return next.call(this, menu);
					};
				},
			})
		);
	}

	private safeRegisterView(type: string, viewCreator: ViewCreator) {
		this.registerView(type, viewCreator);
		this.register(() => {
			this.app.workspace.detachLeavesOfType(type);
		});
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_BOOK_EXPLORER_VIEW);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async reactivateView(type: string, dir?: string, split?: boolean) {
		// this.app.workspace.detachLeavesOfType(type);

		var leaf;
		if (this.app.workspace.getLeavesOfType(type).length == 0) {
			if (dir === "left") {
				leaf = this.app.workspace.getLeftLeaf(split);
			} else if (dir == "right") {
				leaf = this.app.workspace.getRightLeaf(split);
			} else {
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

	private walk(root: string, arr: Array<any>) {
		const fs = (this.app as any).vault.adapter.fs;
		const path = (this.app as any).vault.adapter.path;
		const self = this;
		const files = fs.readdirSync(path.join(self.settings.bookPath, root));
		const fi = Array<string>();
		files.forEach(function (filename: string) {
			const filepath = path.join(root, filename);
			const stat = fs.statSync(path.join(self.settings.bookPath, filepath));
			if (stat.isDirectory() && !filepath.startsWith(".")) {
				arr.push({ name: filename, path: filepath, children: Array<any>() });
				self.walk(filepath,arr.last().children);
			} else {
				const ext = path.extname(filename).substr(1);
				
				if (!filename.startsWith("~$") && !filename.startsWith(".") && SUPPORT_BOOK_TYPES.indexOf(ext) >= 0) { // window 下的临时文件
					fi.push(filename);
				}
			}
		});

		fi.forEach(function (filename: string) {
			const ext = path.extname(filename).substr(1);
			arr.push({
				name: filename,
				path: path.join(root, filename),
				ext: ext ? ext : "unknown",
			});
		});

	}

	updateBookTree() {
		if (!this.isBookPathValid()) return;
		if (this.bookTreeData) {
			this.bookTreeData.length = 0;
		} else {
			this.bookTreeData = Array<any>();
		}
		this.walk("",this.bookTreeData);
	}

	isBookPathValid() {
		return (
			this.settings.bookPath &&
			this.fs.existsSync(this.settings.bookPath) &&
			this.fs.statSync(this.settings.bookPath).isDirectory()
		);
	}


	normalizeBookPath(path: string) {
		return this.path.join(this.settings.bookPath, path);
	}

	normalizeBookDataPath(path: string) {
		return normalizePath(this.settings.bookDataPath+"/"+path);
	}

	openBookBySystem(path: string) {
		window.open("file://" + this.normalizeBookPath(path));
	}

	isForceOpenBySystem(path: string) {
		return this.settings.openAllBOokBySystem 
			|| (this.settings.openOfficeBookBySystem && this.path.extname(path).substr(1) != "pdf"); // TODO: office book mean not pdf book?
	}
	openBookInBookView(path: string) {
		if (this.isForceOpenBySystem(path)) {
			this.openBookBySystem(path);
		} else {
			this.getBookView().then(view => {
						view.openBook(path);
					});
		}
	}

	updateBookProject(file: TFile) {
		this.currentBookProjectFile = file;
		if (
			this.currentBookProjectFile &&
			this.getPropertyValue(this.currentBookProjectFile, "booknote-plugin") ===
			true
		) {
			const bookpaths = this.getPropertyValue(
				this.currentBookProjectFile,
				"booknote-books"
			);
			if (!bookpaths) {
				this.currentBookProjectBooks = [];
			} else {
				const self = this;
				if (this.currentBookProjectBooks)
					this.currentBookProjectBooks.length = 0;
				else this.currentBookProjectBooks = Array<any>();
				bookpaths.forEach((filepath: string) => {
					const ext = this.path.extname(filepath).substr(1);
					self.currentBookProjectBooks.push({
						name: this.path.basename(filepath),
						path: filepath,
						ext: ext ? ext : "unknown",
					});
				});
			}
		}
	}


	async getBookView() {
		if (this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW).length == 0) {
			await this.reactivateView(VIEW_TYPE_BOOK_VIEW,'center',true);
		}
		return this.app.workspace.getLeavesOfType(VIEW_TYPE_BOOK_VIEW)[0].view as BookView;
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

	saveBookAttrs(bookpath: string, attrs: any) {
		const dataPath = this.normalizeBookDataPath(bookpath+".md");
		const dataPathDir = this.path.dirname(dataPath);
		const content = this.genBootAttrMeta(attrs);
	
	
		const file = this.app.vault.getAbstractFileByPath(dataPath) as TFile;
		if (file) {
			this.app.vault.modify(file,content);
		} else {
		
			const folder = this.app.vault.getAbstractFileByPath(dataPathDir) as TFolder;
			if (folder) {
				this.app.vault.create(dataPath, content);
			} else {
				this.app.vault.createFolder(dataPathDir).then(()=>{
					this.app.vault.create(dataPath,content);
					new Notice("已保存");
				});
			}
		}
	}


	saveBookAnnotations(bookpath: string, xfdfDoc: Document) {

		const xfdfString = new XMLSerializer().serializeToString(xfdfDoc);
		const dataPath = this.normalizeBookDataPath(bookpath+".xml");
		const dataPathDir = this.path.dirname(dataPath);
	
		const file = this.app.vault.getAbstractFileByPath(dataPath) as TFile;
		if (file) {
			this.app.vault.modify(file,xfdfString);
		} else {
		
			const folder = this.app.vault.getAbstractFileByPath(dataPathDir) as TFolder;
			if (folder) {
				this.app.vault.create(dataPath, xfdfString);
			} else {
				this.app.vault.createFolder(dataPathDir).then(()=>{
					this.app.vault.create(dataPath,xfdfString);
					new Notice("已保存");
				});
			}
		}
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

	isUrlBook(path: string) {
		return path.startsWith("http://") || path.startsWith("https://");
	}

}

class SampleSettingTab extends PluginSettingTab {
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
			.setName("书籍根路径")
			.addText((text) =>
				text.setValue(this.plugin.settings.bookPath).onChange(async (value) => {
					this.plugin.settings.bookPath = value;
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
			})
		new Setting(containerEl)
			.setName("WebViewer库 路径")
			.setDesc("使用本地服务器时有效")
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
			})

		new Setting(containerEl)
			.setName("WebViewer远程服务器")
			.setDesc("不使用本地服务器时有效")
			.addText((text) => {
				text.setValue(this.plugin.settings.webviewerExternalServerAddress).onChange(async (value) => {
					this.plugin.settings.webviewerExternalServerAddress = value;
					await this.plugin.saveSettings();
				})
			})

		new Setting(containerEl)
			.setName("使用默认应用打开所有书籍")
			.setDesc("使能时双击书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openAllBOokBySystem).onChange(async (value) => {
					this.plugin.settings.openAllBOokBySystem = value;
					await this.plugin.saveSettings();
				})
			})

		new Setting(containerEl)
			.setName("使用默认应用打开Office书籍")
			.setDesc("使能时双击Office书籍总是使用系统默认应用打开")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.openOfficeBookBySystem).onChange(async (value) => {
					this.plugin.settings.openOfficeBookBySystem = value;
					await this.plugin.saveSettings();

				})
			})
	}
}
