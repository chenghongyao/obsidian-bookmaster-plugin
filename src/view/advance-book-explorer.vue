<template>
	<div  class="view-content" style="display: flex">

		
		<obtree v-show="!isSetting" class="book-setting-tree-container" :title="title" :data="bookData" 
			v-on:select-file="onSelectFile" />

		<div class="book-setting-container" >
			
			<input ref="fileinput" type="file" accept=".ris" class="mod-cta" @change="onSelectImportFile" style="display:none"/>

			<template v-if="!isSetting">

				<template v-if="selectedBook" >
					<div class="book-title-container">{{ selectedBook.name}}</div>
					<button class="mod-cta" @click="onEditBookAttrs">编辑</button>
					<button class="mod-cta" @click="onImportBookAttrs">导入</button>


					<template v-if="selectedBook.attrs">
						<div  v-for="(v,k) in BOOK_ATTR_MAP" :key="k" style="margin: 1em 0;">
							<strong>{{BOOK_ATTR_MAP[k].label ? BOOK_ATTR_MAP[k].label : k}}:</strong>
							<br>
							{{(selectedBook.attrs[k] || '-') }}
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
				
				<div  v-for="(item,key) in BOOK_ATTR_MAP" :key="key">

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
import {BOOK_ATTR_MAP} from '../constants'
export default {

	data() {
		return {
			selectedBook: null,

			settingBook: null,
			settingBookAttrs: null, 
			isSetting: false,
			BOOK_ATTR_MAP: BOOK_ATTR_MAP,
		}
	},
	methods: {
		onSelectFile(item) {
			this.selectedBook = item;
		},

		onSaveBookAttrs() {
			// TODO: 直接修改，可能会出事
			if (!this.settingBook.attrs)
				this.settingBook.attrs = {};
			for(const key in this.BOOK_ATTR_MAP) {
				this.settingBook.attrs[key] = this.settingBookAttrs[key].trim();
			}
			this.$emit('save-book-attrs',this.settingBook);
			this.isSetting = false;
		},

		onEditBookAttrs() {
			this.settingBook = this.selectedBook;
			this.settingBookAttrs = {}
			for(const key in this.BOOK_ATTR_MAP) {
				this.settingBookAttrs[key] = (this.settingBook.attrs && this.settingBook.attrs[key]) || '';

				// if (this.settingBookAttrs[key] && this.BOOK_ATTR_MAP[key].type === "array") {
				// 	this.settingBookAttrs[key] = '' + this.settingBookAttrs[key];
				// }
			}
			this.isSetting = true;
		},

		onCancelSetting() {
			this.isSetting = false;
		},
		
		onImportBookAttrs() {
			// TODO:
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
	}

}
</script>


