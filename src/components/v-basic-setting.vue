<template>

<div>
    <div class="book-setting-item oneline">
        <div class="book-setting-label">类型：</div>
        <div class="book-setting-value-container">
            <select class="dropdown book-type" v-model="book.meta.type" @change="onChangeBookType()" ref="bookTypeSelect">
                <option v-for="(item,index) in BOOK_TYPES" 
                    :key="index" 
                    :value="item"
                >
                    {{item}}
                </option>
        </select>
        </div>
    </div>
    <div class="book-setting-item oneline">
        <div class="book-setting-label">状态：</div>
        <div class="book-setting-value-container">
            <div class="book-read-status-indicator"   
            v-for="(item,index) in readStatus" :key="index" 
            :class="[item.class,{active:book.meta['status']===item.class}]"
            @click="onChangeReadStatus(item.class)">
                {{item.value}}
            </div>
        </div>
    </div>

    <div class="book-setting-item oneline">
        <div class="book-setting-label">评分：</div>
        <div class="book-setting-value-container">
            <div class="book-score-icon" v-for="i in 5" :key="i" :class="{fill:  book.meta.rating >= i}" @click="onChangeScore(i)"/>
        </div>
    </div>

    <div class="book-setting-item">
        <div class="book-setting-label">标题：</div>
        <div class="book-setting-value-container">
            <input style="width: 100%" type="text" v-model="book.meta.title" 
            @change="$emit('change','title')"
            @keypress="$emit('change','title')" />
        </div>
    </div>

    <div class="book-setting-item">
        <div class="book-setting-label">作者：</div>
        <div class="book-setting-value-container">
            <v-array-input :array="book.meta.authors" @change="$emit('change','authors')"/>
        </div>
    </div>
    
    <div class="book-setting-item">
        <div class="book-setting-label">标签：</div>
        <div class="book-setting-value-container">
            <v-array-input :array="book.meta.tags" @change="$emit('change','tags')"/>
        </div>
    </div>
    <div class="book-setting-item">
        <div class="book-setting-label">描述：</div>
        <div class="book-setting-value-container">
            <textarea style="width: 100%;" v-model="book.meta.desc" class="book-desc-textarea"
            @change="$emit('change','desc')"
            @keypress="$emit('change','desc')" />
        </div>
    </div>
    <div class="book-setting-item">
        <div class="book-setting-label">笔记：<div v-if="book.meta.note" @click="openNote" class="book-setting-note-indicator"></div></div>
        <div class="book-setting-value-container">
            <input style="width: 100%" type="text" v-model="book.meta.note" 
            @keypress="$emit('change','note')" />
        </div>
    </div>

</div> 

</template>

<script>
import vArrayInput from "./v-array-input.vue"
import {BOOK_TYPES} from "../constants"

export default {
    components: {
        vArrayInput
    },
    data() {
        return {
            readStatus: [
                {
                    class: "unread",
                    value: "未读"
                },
                {
                    class: "reading",
                    value: "在读"
                },
                {
                    class: "finished",
                    value: "已读"
                },

            ],
            BOOK_TYPES: BOOK_TYPES
        }
    },
    methods: {
        onChangeReadStatus(newStatus) {
            if (newStatus === this.book.meta["status"]) {
                return;
            }
            this.book.meta["status"] = newStatus;
            this.$emit("change","status");
        },
        onChangeScore(newScore) {
            if (newScore === this.book.meta.rating) {
                return;
            }
            this.book.meta.rating = newScore;
            this.$emit("change","rating");
        },
        onChangeBookType() {
            this.$emit("change","type");
        },
        openNote() {
            this.$emit("open-note");
        }

    },
    created() {

    },
    computed: {
    },
    props: {
        book: Object,
    }
}
</script>


<style>
div.modal.basic-book-setting-modal {
    padding-left: 1.5em;
    padding-right: 1.5em;
    width: 400px;
    min-width: 200px;
}
div.modal-title.book-setting-title {
    font-size:12pt;
    border-bottom: 1px solid gray;
    line-height:1.5em;
    /* padding: 0px Imp !important; */
}
div.book-setting-item {
    /* display: flex; */
    padding: 0.2em 0;
    width: 100%;
}

div.book-setting-item.oneline {
    display: flex;
    align-items: center;
}
div.book-setting-label {
    /* font-weight: bold; */
    font-size: 11pt;
    margin-left: 0px;
}

div.book-setting-item:not(.oneline) > div.book-setting-label {
    padding-bottom: 0.1em;
}
div.book-setting-value-container {
    margin-left: auto;
    margin-right: 0px;
    display:flex;
}
div.book-setting-value-container.full {
    flex: 1;
}
div.book-setting-value-container textarea.book-desc-textarea {
    height: 8em !important;
}
div.book-read-status-indicator {
    padding: 0px 6px;
    font-size: 11pt;
    color: white;
    background-color: rgb(102, 101, 101);
}
div.book-read-status-indicator.active:hover {
    background-color: var(--text-accent) !important;
    
}
div.book-read-status-indicator:hover {
    background-color: var(--text-accent);
}

div.book-read-status-indicator.unread.active {
    background: rgb(73, 29, 29);
}
div.book-read-status-indicator.reading.active {
    background: #867702;
}
div.book-read-status-indicator.finished.active {
    background: rgb(20, 73, 27);
}

.book-setting-item  .dropdown {
    padding: 3px 25px 3px 8px;
    width: fit-content;
}

div.book-setting-note-indicator {
    position: relative;
    content: " ";
    display: inline-block;
    width: 1em;
    height: 1em;

    opacity: 0.6;
    /* margin-right: 0px; */
    margin-left: -8px;
    margin-bottom: -2px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center center;
    background-color: var(--text-folder-file-icon);
    -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill=""><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>');
}
div.book-setting-note-indicator:hover {
    opacity: 1;
}
div.book-score-icon {
    width: 20px;
    height: 20px;
    filter: invert(70%);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 18.26l-7.053 3.948 1.575-7.928L.587 8.792l8.027-.952L12 .5l3.386 7.34 8.027.952-5.935 5.488 1.575 7.928L12 18.26zm0-2.292l4.247 2.377-.949-4.773 3.573-3.305-4.833-.573L12 5.275l-2.038 4.42-4.833.572 3.573 3.305-.949 4.773L12 15.968z'/%3E%3C/svg%3E");
}

/* div.book-score-icon:hover {
    filter: invert(100%);
} */

div.book-score-icon.fill {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='20' height='20'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 18.26l-7.053 3.948 1.575-7.928L.587 8.792l8.027-.952L12 .5l3.386 7.34 8.027.952-5.935 5.488 1.575 7.928z'/%3E%3C/svg%3E");
}
</style>