<template>
	<div class="nav-files-container node-insert-event" style="position: relative;height: 100%" >
		<div class="nav-folder mod-root bm-root">
			<div class="nav-folder-title" :data-count="root.count" v-show="showTitle">
				<div class="nav-folder-collapse-indicator collapse-icon"/>
				<div ref="titleEl" class="nav-folder-title-content">{{root.name}}</div>
			</div>	
			<div class="nav-folder-children">
				<v-obtree-item v-for="child in root.children" 
				:key="child.path" :item="child" 
				v-on:select-file="onSelectFile"
				v-on:open-file="(item)=>$emit('open-file',item,false)"
				v-on:context-menu="onContextMenu"
				v-on:folder-context-menu="onFolderContextMenu"
				:showNoteIcon="showNoteIcon"
				/>
			</div>
		</div>
	</div>
</template>

<script>
//event: select-file, open-file, 'context-menu
import vObtreeItem from "./v-obtree-item.vue"

export default {
	name: 'v-obtree',
	data() {
		return {
			activatedNode:null,
			root: this.data,
		}
	},
	props: {
		showTitle: {
			type: Boolean,
			default: true,
		},
		data: Object,
		showNoteIcon: Boolean
	},
	
	methods: {
		onSelectFile(node, ctrlKey){
			if (this.activatedNode) {
				this.activatedNode.isActivate = false;
			}
			this.activatedNode = node;
			this.activatedNode.isActivate = true;

			if (ctrlKey) {
				this.$emit('open-file',node.item, true);
			} else {
				this.$emit('select-file',node.item);
			}
		},
		onContextMenu(e,node) {
			if (this.activatedNode) {
				this.activatedNode.isActivate = false;
			}
			this.activatedNode = node;
			this.activatedNode.isActivate = true;

			this.$emit('context-menu',e, node.item)
		},
		onFolderContextMenu(e,node) {
			this.$emit('folder-context-menu',e, node.item)
		},
		setTitle(title) {
			this.$refs.titleEl.setText(title);
		}
	},
	components: {
		vObtreeItem,
	},
}
</script>