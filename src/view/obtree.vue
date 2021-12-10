<template>
	<div class="nav-files-container node-insert-event" style="position: relative" >
		<div class="nav-folder mod-root">
			<div class="nav-folder-title" v-show="title">
				<div class="nav-folder-collapse-indicator collapse-icon"/>
				<div class="nav-folder-title-content">{{title}}</div>
			</div>	
			<div class="nav-folder-children">
				<obtree-item v-for="(child, index) in treeData" 
				:key="index" :item="child" 
				v-on:select-file="selectFile"
				v-on:open-file="(item)=>$emit('open-file',item)"
				v-on:context-menu="(event, item)=>$emit('context-menu',event, item)"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import obtreeItem from "./obtree-item.vue"

export default {
	name: 'obtree',
	data() {
		return {
			activatedFile:null,
			treeData: this.data, // TODO:可以保证data更新时，视图同步更新
		}
	},
	props: {
		title: String,
		data: Array,
	},
	
	methods: {
		selectFile(node, ctrlKey){
			if (this.activatedFile) {
				this.activatedFile.isActivate = false;
			}
			this.activatedFile = node;
			this.activatedFile.isActivate = true;
			this.$emit('select-file',node.item, ctrlKey);
		},
	},
	components: {
		obtreeItem,
	}
}
</script>