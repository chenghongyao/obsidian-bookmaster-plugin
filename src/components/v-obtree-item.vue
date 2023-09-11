<template>
    <!-- folder -->
    <div v-if="isFolder" class="tree-item nav-folder" :class="{'is-collapsed':!isOpen}">
        <div class="tree-item-self is-clickable mod-collapsible nav-folder-title" 
            :data-path="item.path" 
            :data-count="item.count" 
            @click="toggleFolder"
            @contextmenu.prevent="onFolderContextMenu"
            >
            <div class="tree-item-icon  nav-folder-collapse-indicator collapse-icon" :class="{'is-collapsed':!isOpen}" />
            <div class="tree-item-inner nav-folder-title-content">{{item.name}}</div>
        </div>	
        <div v-show="isOpen" class="tree-item-children nav-folder-children">
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
    <div v-else class="tree-item nav-file" :class="`book-${item.ext}`">
        <div class="tree-item-self is-clickable nav-file-title" 
            :class="{'is-active':isActivate,
                    'bm-lost': item.meta && item.lost,
                    'bm-unread': item.meta && item.meta['status'] === 'unread', 
                    'bm-reading': item.meta && item.meta['status'] === 'reading',
                    'bm-finished': item.meta && item.meta['status'] === 'finished'}"
            :data-path="item.path"
            :data-count="progress"
            @click.exact="onSelectFile(false)"
            @click.ctrl="onSelectFile(true)"
            @dblclick="$emit('open-file',item)"
            @contextmenu.prevent="onContextMenu"
            >
            <!-- <div class="nav-file-tag">{{item.ext}}</div> -->
            <div class="tree-item-inner nav-file-title-content" :class="{'hasnote': showNoteIcon && item.meta && item.meta.note}">
                {{(item.meta && item.meta.title) || item.name}}
            </div>
        </div>
    </div>
    
    </template>


<script lang="js">
import { defineComponent } from 'vue'

export default defineComponent({
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
		},
		onFolderContextMenu(e) {
			this.$emit('folder-context-menu',e,this)
		}

	},
    computed: {
		isFolder() {
			return this.item.isFolder(); 
		},
		progress() {
			const {progress,total} = this.item.meta;
			if (progress && total) {
				return progress > total ? "100%" : (progress*100/total).toFixed(0).toString()+"%";
			} else {
				return "0%";
			}
		}
	}

})
</script>

<style>
/* read status */
div.nav-file-title.bm-unread {
    border-right: 4px solid rgba(255, 0, 0, 0.3);;
}
div.nav-file-title.bm-reading {
    border-right: 4px solid rgba(255, 255, 0, 0.3);;
}
div.nav-file-title.bm-finished {
    border-right: 4px solid rgba(0, 255, 0, 0.3);
}

/* lost status */
div.nav-file-title.bm-lost > div.nav-file-title-content{
    color: red;
}
div.nav-file-title.bm-lost:hover > div.nav-file-title-content {
    color: red;
}


.is-mobile .nav-folder.mod-root.bm-root > .nav-folder-title .nav-folder-title-content {
    display: block;
}

/* data-count */
.bm-root .nav-folder-title-content {
	flex-grow: 1;
}
.bm-root .nav-folder-title[data-count]::after {
    content: attr(data-count);
    display: inline-block;
    position: relative;
    font-size: calc(100% * 0.8);
    margin-right: 2px;
    /* border-radius: 3px; */
    padding: 2px 0;
    /* background-color: var(--background-secondary-alt); */
    transition: opacity 100ms ease-in-out;
}
.bm-root .nav-folder-title[data-count='0']::after {
    display: none;
}


.bm-root .nav-file-title-content {
	flex-grow: 1;
}

.bm-root .bm-reading.nav-file-title[data-count]::after {
    content: attr(data-count);
    display: inline-block;
    position: relative;
    font-size: calc(100% * 0.8);
    margin-right: 1px;
    /* border-radius: 3px; */
    padding: 1px 0;
    /* background-color: var(--background-secondary-alt); */
    transition: opacity 100ms ease-in-out;
}
</style>