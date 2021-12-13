<template>
<div class="book-search-container" >

	<div class="book-search-query-container">
		<input ref="query" v-model="query"  type="text" spellcheck="false" placeholder="输入文件名,不包括后缀" 
		@input="searchBooks" 
		@keydown.enter="openBook"
		@keydown.up="selectPrev"
		@keydown.down="selectNext"
		/>
	</div>


	<div class="nav-folder-children book-search-result-container">
		<div  v-for="(item, index) in result" :key="index" class="nav-file" :class="`book-${item.ext}`">
			<div class="nav-file-title" :class="{'is-active':index === selectedIndex}"
				@click.exact="selectFile(index)"
				@click.ctrl="$emit('open-file',item,true)"
				@dblclick="$emit('open-file',item,false)"
			>
				<div class="nav-file-title-content" >
					{{(item.attrs && item.attrs.title) || item.name}}
				</div>

			</div>
		</div>
	</div>
	


</div>
</template>

<script>

export default {
	data() {
		return {
			query: "",
			result: [],
			selectedIndex: 0,
		}
	}, 
	props: {
		books: Array,
	},

	methods: {

		_searchBooks(tree) {
			tree.forEach((b) => {
				if (b.children) {
					this._searchBooks(b.children);
				} else {
					// search title only if title exists
					const name = (b.attrs && b.attrs.title) || b.name.substr(0,b.name.lastIndexOf("."));
					if (name.indexOf(this.query) >= 0) {
						this.result.push(b);
					}
				}
				
			});
		},

		searchBooks() {
			this.result.length = 0;
			if (this.query !== "") {
				this._searchBooks(this.books);
				if (this.selectedIndex >= this.result.length)this.selectedIndex = 0;
			} else {
				this.selectedIndex = 0;
			}
		},
		selectPrev() {
			this.selectedIndex = (this.selectedIndex+this.result - 1)%this.result.length;
		},
		selectNext() {
			this.selectedIndex = (this.selectedIndex+1)%this.result.length;
		},
		selectFile(index) {
			this.selectedIndex = index;
		},
		openBook() {
			this.$emit("open-file",this.result[this.selectedIndex],true);
		}
		

	},
	mounted() {
		this.$refs.query.focus();
	},
	computed: {
		
	}

}
</script>