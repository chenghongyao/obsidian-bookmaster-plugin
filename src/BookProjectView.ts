import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import Vue from "vue";
import BookNotePlugin from "./main";
import NavHeader from "./NavHeader";
import obtree from "./view/obtree.vue"



export const VIEW_TYPE_BOOK_PROJECT_VIEW = "book-project-view"
export class BookProjectView extends ItemView {
	plugin: BookNotePlugin;
	navHeader: NavHeader;
	vueApp: Vue;
	descriptionContainer: HTMLDivElement;

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getDisplayText() {
		return "Book Project";
	}

	getViewType() {
		return VIEW_TYPE_BOOK_PROJECT_VIEW;
	}

	getIcon() {
		return "blocks";	
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
				self.plugin.openBookBySystem(fileitem.path);
			})
		)


		// menu.addItem((item: any) =>
		// item
		// 	.setTitle("删除")
		// 	.setIcon("trash")
		// 	.onClick(()=>{
		// 		new Notice("删除文件");
		// 		// self.plugin.openFileBySystem(self.plugin.normalizeBookPath(fileitem.path));
		// 	})
		// )

		menu.showAtMouseEvent(evt);
	}


	async onOpen() {

		console.log("BookProjectView Open");

		const self = this;
		this.contentEl.empty();
		this.navHeader = new NavHeader(this,this.contentEl);
		this.navHeader.addAction("reset","更新",(evt) => {
			self.plugin.updateBookProject(self.plugin.currentBookProjectFile);
		})
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		})
		this.navHeader.addAction("document","占位",(evt) => {
			console.log(evt);
		})

		// const title = this.plugin.path.basename(this.plugin.settings.bookPath);
		const el = this.contentEl.createDiv()
		this.vueApp = new Vue({
			el: el,
			render: h => h('obtree', {
				attrs: {
					title: null,
					data: self.plugin.currentBookProjectBooks
				},
				on: {
					'select-file': function (item: any, ctrlKey: boolean) {
						const description = self.plugin.getBookAttrs(item.path)?.["description"];
						self.descriptionContainer.setText(description ? description : '');
						if (ctrlKey) {
							if (item.isUrl) {
								self.plugin.openBookBySystem(item.path);
							} else {
								self.plugin.openBookInBookView(item.path,true);
							}
						}
					},
					'open-file': function (item: any) {
						if (item.isUrl) {
							self.plugin.openBookBySystem(item.path);
						} else {
							self.plugin.openBookInBookView(item.path,false);
						}
					},
					'context-menu': function(evt: MouseEvent, item: any) {
						self.openContextMenu(evt,item);
					}
				},
			}),
			components: {
				obtree,
			}
		});

		this.descriptionContainer = this.containerEl.createDiv({cls:"book-description-container"});
		
	}

	async onClose() {
		console.log("BookProjectView Close");
	}
}