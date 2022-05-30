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


