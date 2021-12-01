<template>
<div>
	<div class="nav-folder mod-root">
	<div class="nav-folder-title" >
		<div class="nav-folder-collapse-indicator collapse-icon"/>
		<div class="nav-folder-title-content">{{title}}</div>
	</div>	

	<div class="nav-folder-children">
		<div v-for="(name,index) in bookNames" :key="index" class="nav-file">
			<div class="nav-file-title" 
			:class="{'is-active':isActivate}"
			@dblclick="$emit('open-file',books[index])"
			>
				<div class="nav-file-title-content">
					{{name}}
				</div>
			</div>
		</div>
	</div>

</div>


	

</div>
</template>

<script>
export default {
	name: 'book-project',
	data() {
		return {
			isActivate: false,
			isOpen: false,
			
		}
	},
	props: {
		title: String,
		books: Array,
		app: Object,
	},
	methods: {
		
	},
	computed: {
		bookNames() {
			return this.books.map(bookpath => 
				app.vault.adapter.path.basename(bookpath)
			);
		}
	}
	
}
</script>