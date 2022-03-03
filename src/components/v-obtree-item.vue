<template>
<!-- folder -->
<div v-if="isFolder" class="nav-folder" :class="{'is-collapsed':!isOpen}">
	<div class="nav-folder-title" :data-path="item.path" @click="toggleFolder">
		<div class="nav-folder-collapse-indicator collapse-icon"/>
		<div class="nav-folder-title-content">{{item.name}}</div>
	</div>	
	<div v-show="isOpen" class="nav-folder-children">
		<!-- can't auto send event?? -->
		<v-obtree-item v-for="child in item.children" 
		:showNoteIcon="showNoteIcon"
		:key="child.path" :item="child" 
		@open-file="(item) => $emit('open-file',item)"
		@context-menu="(e,node) => $emit('context-menu',e,node)"
		@select-file="(node,ctrlKey) => $emit('select-file',node,ctrlKey)"
		/>
	</div>
</div>
<!-- file -->
<div v-else class="nav-file" :class="`book-${item.ext}`">
	<div class="nav-file-title" 
		:class="{'is-active':isActivate,
				'bm-lost': item.meta && item.lost,
				'bm-unread': item.meta && item.meta['status'] === 'unread', 
				'bm-reading': item.meta && item.meta['status'] === 'reading',
				'bm-finished': item.meta && item.meta['status'] === 'finished'}"
		:data-path="item.path"
		@click.exact="onSelectFile(false)"
		@click.ctrl="onSelectFile(true)"
		@dblclick="$emit('open-file',item)"
		@contextmenu.prevent="onContextMenu"
		>
		<div class="nav-file-tag">{{item.ext}}</div>
		<div class="nav-file-title-content" :class="{'hasnote': showNoteIcon && item.meta && item.meta.note}">
			{{(item.meta && item.meta.title) || item.name}}
		</div>
	</div>
</div>

</template>


<script>
//event:open-file, select-file, context-menu

export default {

	name: 'v-obtree-item',
	data() {
		return {
			isOpen: false,
			isActivate: false,
		}
	},
	props: {
		item: Object,
		showNoteIcon: Boolean,
	},
	methods: {
		toggleFolder() {
			this.isOpen = !this.isOpen;
		},

		onSelectFile(ctrlKey) {
			this.$emit('select-file',this, ctrlKey);
		},
		onContextMenu(e) {
			this.$emit('context-menu',e,this)
		}

	},
	computed: {
		isFolder() {
			return this.item.isFolder(); 
		},
	}
}

</script>