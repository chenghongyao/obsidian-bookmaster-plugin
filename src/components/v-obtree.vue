<template>
        <div class="nav-folder mod-root bm-root">
            <div class="nav-folder-title" :data-path="root.path" :data-count="root.count" v-show="showTitle">
                <div class="nav-folder-collapse-indicator collapse-icon"></div>
                <div ref="titleEl" class="nav-folder-title-content">{{root.name}}</div>
            </div>
            <div class="nav-folder-children">
                <v-obtree-item v-for="child in root.children" 
                    :key="child.path" 
                    :item="child" 
                    :showNoteIcon="showNoteIcon"
                    v-on:select-file="onSelectFile"
                    v-on:open-file="(item)=>$emit('open-file',item,false)"
                    v-on:context-menu="onContextMenu"
                    v-on:folder-context-menu="onFolderContextMenu"
				/>
            </div>
        </div>
</template>


<script>
// count path name children
import { defineComponent } from 'vue'
import vObtreeItem from './v-obtree-item.vue';

export default {
	components: {
		vObtreeItem
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
	props: {
		showTitle: {
			type: Boolean,
			default: true,
		},
		root: {
			type: Object,
			required: true,
		},
		showNoteIcon: Boolean
	},
	// setup(props) {
	// 	return {
	// 		root: props.root,
	// 		showTitle: props.showTitle
	// 	}
	// }
}

// export default defineComponent({
//     name: 'v-obtree',
//     data() {
// 		return {
// 			activatedNode:null,
// 		}
// 	},
//     methods: {
//         onSelectFile(node, ctrlKey){
// 			if (this.activatedNode) {
// 				this.activatedNode.isActivate = false;
// 			}
// 			this.activatedNode = node;
// 			this.activatedNode.isActivate = true;

// 			if (ctrlKey) {
// 				this.$emit('open-file',node.item, true);
// 			} else {
// 				this.$emit('select-file',node.item);
// 			}
// 		},
// 		onContextMenu(e,node) {
// 			if (this.activatedNode) {
// 				this.activatedNode.isActivate = false;
// 			}
// 			this.activatedNode = node;
// 			this.activatedNode.isActivate = true;

// 			this.$emit('context-menu',e, node.item)
// 		},
// 		onFolderContextMenu(e,node) {
// 			this.$emit('folder-context-menu',e, node.item)
// 		},
// 		setTitle(title) {
// 			this.$refs.titleEl.setText(title);
// 		}
//     },
//     props: {
// 		showTitle: {
// 			type: Boolean,
// 			default: true,
// 		},
// 		root: {
// 			type: Object,
// 			required: true,
// 		},
// 		showNoteIcon: Boolean
// 	},
// 	computed: {
		
// 	},
//     components: {
// 		vObtreeItem,
// 	},
// 	created() {
// 	},
// })
</script>