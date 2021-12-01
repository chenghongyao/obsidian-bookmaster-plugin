<template>
<div v-if="isFolder" class="nav-folder" :class="{'is-collapsed':!isOpen}">
	<div class="nav-folder-title" @click="toggle">
		<div class="nav-folder-collapse-indicator collapse-icon"/>
		<div class="nav-folder-title-content">{{item.name}}</div>
	</div>	

	<div v-show="isOpen" class="nav-folder-children">
		<obtree-item v-for="(child, index) in item.children" 
		:key="index" :item="child" 
		v-on:select-file="(node)=>$emit('select-file',node)"
		v-on:open-file="(item)=>$emit('open-file',item)"
		v-on:context-menu="(e,item)=>$emit('context-menu',e,item)"
		/>
	</div>
</div>

<div v-else class="nav-file" :class="`book-${item.ext}`">
	<div class="nav-file-title" 
		:class="{'is-active':isActivate}"
		@click="selectFile"
		@dblclick="$emit('open-file',item)"
		@contextmenu.prevent="$emit('context-menu',$event,item)"
		>
		<div class="nav-file-title-content" >
			{{item.name}}
		</div>
	</div>
</div>

</template>


<script>


export default {

	name: 'obtree-item',
	data() {
		return {
			isOpen: false,
			isActivate: false,
		}
	},
	props: {
		item: Object,
	},
	methods: {
		toggle() {
			this.isOpen = !this.isOpen;
		},

		selectFile(e) {
			this.$emit('select-file',this);
		},

	},
	computed: {
		isFolder() {
			return this.item.children; 
		}
	}
}

</script>