import { ItemView, Menu, Notice, WorkspaceLeaf } from "obsidian";
import Vue from "vue";
import BookNotePlugin from "./main";
import NavHeader from "./NavHeader";
import { AbstractBook } from "./types";
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

		this.plugin.updateBookDispTree();
		const self = this;
		this.contentEl.empty();

		if (!this.plugin.isCurrentBooksPathValid()) {
			const ele = this.contentEl.createDiv("empty-state");
			ele.textContent = "无效书籍路径，请检查设置";
		} else {
			const title = this.plugin.path.basename(this.plugin.settings.bookPath);
			this.vueApp = new Vue({
				el: this.contentEl,
				render: h => h('advance-book-explorer', {
					attrs: {
						title: title,
						bookData: this.plugin.bookDispTree,
						plugin: this.plugin,
					},
					on: {
						"save-book-attrs": function(book: AbstractBook) {
							self.plugin.saveBookAttrs(book);
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