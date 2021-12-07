import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import Vue from "vue";
import BookNotePlugin from "./main";
import NavHeader from "./NavHeader";
import advanceBookExplorer from './view/advance-book-explorer.vue'





export const VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW = "advance-book-explorer-view"
export class AdvanceBookExplorerView extends ItemView {
	plugin: BookNotePlugin;
	navHeader: NavHeader;
	vueApp: Vue;

	settingMap: any;

	constructor(leaf: WorkspaceLeaf, plugin: BookNotePlugin) {
		super(leaf);
		this.plugin = plugin;
		leaf.setPinned(true);
		this.settingMap = {
			author: {
				label: "作者",
				placeholder: "以逗号分隔"
			},
			"publish date": {
				label: "出版时间",
			},
			"publisher": {
				label: "出版商",
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
			}
		}
	}

	getDisplayText() {
		return "Advance Book Explorer";
	}

	getViewType() {
		return VIEW_TYPE_ADVANCE_BOOK_EXPLORER_VIEW;
	}

	getIcon() {
		return "bold-glyph";	
	}


	async onOpen() {

		console.log("AdvanceBookExplorerView Open");

		this.plugin.updateBookTree();
		const self = this;
		this.contentEl.empty();

		if (!this.plugin.isBookPathValid()) {
			const ele = this.contentEl.createDiv("empty-state");
			ele.textContent = "无效书籍路径，请检查设置";
		} else {
			const title = this.plugin.path.basename(this.plugin.settings.bookPath);
			this.vueApp = new Vue({
				el: this.contentEl,
				render: h => h('advance-book-explorer', {
					attrs: {
						title: title,
						bookData: this.plugin.bookTreeData,
						plugin: this.plugin,
						settingMap: this.settingMap,
					},
					on: {
						"save-book-attrs": function(bookpath: string, attrs: any) {
							self.plugin.saveBookAttrs(bookpath,attrs);
						}
					}
				}),
				components: {
					advanceBookExplorer,
				}
			});
		}

	}

	async onClose() {
		console.log("AdvanceBookExplorerView Close");
	}
}