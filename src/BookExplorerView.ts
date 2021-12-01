import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import Vue from "vue";
import BookNotePlugin from "./main";
import NavHeader from "./NavHeader";
import obtree from "./view/obtree.vue"





export const VIEW_TYPE_BOOK_EXPLORER_VIEW = "book-explorer-view"
export class BookExplorerView extends ItemView {
	plugin: BookNotePlugin;
	navHeader: NavHeader;
	vueApp: Vue;
	descriptionContainer: HTMLDivElement;

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Book Explorer";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_EXPLORER_VIEW;
	}

	getIcon() {
		return "bold-glyph";	
	}


	openContextMenu(evt: MouseEvent, fileitem:any) {
		const self = this;
		const menu = new Menu(this.app);
		menu.addItem((item) =>
		item
			.setTitle("复制路径")
			.setIcon("link")
			.onClick(()=>{
				navigator.clipboard.writeText(fileitem.path.replaceAll('\\','/'));
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("使用默认应用打开")
			.setIcon("popup-open")
			.onClick(()=>{
				self.plugin.openFileBySystem(self.plugin.normalizeBookPath(fileitem.path));
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("设置(未实现")
			.setIcon("popup-open")
			.onClick(()=>{
				// self.plugin.openFileBySystem(self.plugin.normalizeBookPath(fileitem.path));
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("引用(未实现")
			.setIcon("popup-open")
			.onClick(()=>{
				// self.plugin.openFileBySystem(self.plugin.normalizeBookPath(fileitem.path));
			})
		)

		menu.addItem((item: any) =>
		item
			.setTitle("删除")
			.setIcon("trash")
			.onClick(()=>{
				new Notice("删除文件,展不实现");
			})
		)

		menu.showAtMouseEvent(evt);
	}


	async onOpen() {

		console.log("BookExplorerView Open");

		this.plugin.updateBookTree();
		const self = this;
		// this.containerEl.children[0].empty();
		this.contentEl.empty();
		this.navHeader = new NavHeader(this,this.contentEl);
		this.navHeader.addAction("reset","更新",(evt) => {
			if (!this.plugin.isBookPathValid()) {
				// TODO 书籍路径错误
				new Notice("书籍路径解析错误,请检查设置后重新打开");
			} else {
				self.plugin.updateBookTree();
			}
		})
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		})
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		})


		if (!this.plugin.isBookPathValid()) {
			const ele = this.contentEl.createDiv();
			ele.textContent = "无效书籍路径，请检查设置";
		} else {
			const title = this.plugin.path.basename(this.plugin.settings.bookPath);
			const el = this.contentEl.createDiv()
			this.vueApp = new Vue({
				el: el,
				render: h => h('obtree', {
					attrs: {
						title: title,
						data: this.plugin.bookTreeData,
						style: "overflow: auto"
					},
					on: {
						'select-file': function (item: any) {
							const description = self.plugin.getBookAttrs(item.path)?.["description"];
							self.descriptionContainer.setText(description ? description : '');
				
						},
						'open-file': function (item: any) {
							// self.plugin.openFileBySystem(self.plugin.normalizeBookPath(item.path));
							self.plugin.getBookView().then(view => {
								view.openBook(item.path);
							})
						},
						'context-menu': function(evt: MouseEvent, item: any) {
							self.openContextMenu(evt,item);
						}
					}
				}),
				components: {
					obtree,
				}
			});


			this.descriptionContainer = this.containerEl.createDiv({cls:"book-description-container"});
		}
		
	}
	async onClose() {
		console.log("BookExplorerView Close");
	}
}