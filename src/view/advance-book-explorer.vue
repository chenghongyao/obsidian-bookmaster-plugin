<template>
	<div  class="view-content" style="display: flex">

		<obtree v-show="!isSetting" class="book-setting-tree-container" :title="title" :data="bookData" 
			v-on:select-file="onSelectFile" />

		<div class="book-setting-container" >
			
			<input ref="fileinput" type="file" accept=".ris" class="mod-cta" @change="onSelectImportFile" style="display:none"/>
			<template v-if="!isSetting">

				<template v-if="selectedBook" >
					<div class="book-title-container">{{selectedBook.name}}</div>
					<button class="mod-cta" @click="onEditBookAttrs">编辑</button>
					<button class="mod-cta" @click="onImportBookAttrs">导入</button>


					<template v-if="selectedBookAttrs">
						<div  v-for="(value,name) in selectedBookAttrs" :key="name" style="margin: 1em 0;">
							<strong>{{(settingMap[name] && settingMap[name].label)? settingMap[name].label : name}}:</strong>
							<br>
							{{!value ? '-' : value}}
						</div>
					</template>
					<div v-else>
						<a style="position:absolute; top: 50%;left: 50%;transform: translate(0,-50%)" @click="onEditBookAttrs">未设置,点击创建</a>
					</div>

				</template>	
			</template>
			<template v-else>
				<div class="book-title-container"> {{settingBook.name}}</div>
				<button class="mod-cta" @click="onSaveBookAttrs">保存</button>
				<button class="mod-cta" @click="onCancelSetting">取消</button>
				<button class="mod-cta" @click="onImportBookAttrs">导入</button>
				
				<div  v-for="(item,key) in settingMap" :key="key">

					<div style="margin: 0.5em 0">{{item.label ? item.label : key}}</div>	

					<textarea v-if="item.type == 'textarea'" type="text"  v-model="settingBookAttrs[key]" spellcheck="false" :placeholder="item.placeholder" />
					<input v-else  v-model="settingBookAttrs[key]" type="text" spellcheck="false" :placeholder="item.placeholder"/>

	
				</div>
			</template>

		</div>
		
	</div>
	
</template>

<script>
import obtree from './obtree.vue'
export default {

	data() {
		return {
			selectedBookAttrs: null,
			selectedBook: null,

			settingBook: null,
			settingBookAttrs: null, 
			isSetting: false,
		}
	},
	methods: {
		onSelectFile(item) {
			this.selectedBook = item;
			this.selectedBookAttrs = this.plugin.getBookAttrs(item.path);
		},

		onSaveBookAttrs() {
			// TODO: 直接修改，可能会出事
			this.selectedBook = this.settingBook;
			this.selectedBookAttrs = this.settingBookAttrs;
			this.isSetting = false;
			this.$emit('save-book-attrs',this.settingBook.path, this.settingBookAttrs);
		},

		onEditBookAttrs() {
			this.settingBook = this.selectedBook;
			this.settingBookAttrs = {}
			for(const key in this.settingMap) {
				this.settingBookAttrs[key] = (this.selectedBookAttrs && this.selectedBookAttrs[key]) ? this.selectedBookAttrs[key] : '';
			}
			this.isSetting = true;
		},

		onCancelSetting() {
			this.isSetting = false;
		},
		
		onImportBookAttrs() {
			this.$refs["fileinput"].click();
		},
		onSelectImportFile(event) {
			const self = this;
			const file = event.target.files[0];
			if (file) {
				var reader = new FileReader();
				reader.readAsText(file);
				reader.onload = function() {
					const attrs = self.plugin.parseRisFile(this.result);
					console.log(attrs);

				} 
			}
		}


	},

	components: { obtree },

	props: {
		title: String,
		bookData: Array,
		plugin: Object,
		settingMap: Object,
	}

}
</script>


